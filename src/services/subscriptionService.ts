import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { COLLECTIONS, SUBSCRIPTION_PLANS, APP_CONFIG } from '@/utils/constants';
import { Recruiter } from '@/types';
import { parseFirestoreDate } from '@/utils/formatters';
import { functionsService } from './functionsService';

export interface RazorpayResponse {
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

interface RazorpayInstance {
  open: () => void;
  close?: () => void;
  on?: (event: string, callback: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// Module-level references for guaranteed instance lifecycle management across components
let activeRzpInstance: RazorpayInstance | null = null;
let activePollIntervalId: ReturnType<typeof setInterval> | null = null;
let activeCleanupFn: (() => void) | null = null;

/**
 * Restores Razorpay DOM elements so that a newly opened checkout instance
 * is fully visible and not blocked by any leftover style overrides.
 */
const restoreRazorpayDom = (): void => {
  try {
    const selectors = [
      '.razorpay-container',
      '.razorpay-backdrop',
      'iframe.razorpay-checkout-frame',
      'iframe[src*="razorpay"]',
      'iframe[name*="razorpay"]',
      'div.razorpay-loader',
      '[class*="razorpay-"]',
      '[id*="razorpay-"]',
    ];
    selectors.forEach((sel) => {
      document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
        try {
          el.style.removeProperty('display');
          el.style.removeProperty('visibility');
          el.style.removeProperty('opacity');
          el.style.removeProperty('pointer-events');
          el.style.removeProperty('z-index');
        } catch {
          // ignore
        }
      });
    });
  } catch (err) {
    console.warn('[Razorpay DEBUG] restoreRazorpayDom error:', err);
  }
};

/**
 * Hides Razorpay DOM elements non-destructively when payment is confirmed or dismissed.
 */
const hideRazorpayDom = (): number => {
  try {
    const selectors = [
      '.razorpay-container',
      '.razorpay-backdrop',
      'iframe.razorpay-checkout-frame',
      'iframe[src*="razorpay"]',
      'iframe[name*="razorpay"]',
      'div.razorpay-loader',
      '[class*="razorpay-"]',
      '[id*="razorpay-"]',
    ];
    let count = 0;
    selectors.forEach((sel) => {
      document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
        try {
          el.style.setProperty('display', 'none', 'important');
          el.style.setProperty('visibility', 'hidden', 'important');
          el.style.setProperty('opacity', '0', 'important');
          el.style.setProperty('pointer-events', 'none', 'important');
          el.style.setProperty('z-index', '-9999', 'important');
          count++;
        } catch {
          // ignore
        }
      });
    });
    if (typeof document !== 'undefined' && document.body) {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.height = '';
      document.body.classList.remove('razorpay-open');
    }
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.style.overflow = '';
    }
    return count;
  } catch (e) {
    console.warn('[Razorpay DEBUG] hideRazorpayDom error:', e);
    return 0;
  }
};

const countVisibleContainers = () => {
  try {
    const els = document.querySelectorAll<HTMLElement>(
      '.razorpay-container, iframe.razorpay-checkout-frame, .razorpay-backdrop, div[class*="razorpay"]'
    );
    let visible = 0;
    els.forEach((el) => {
      const style = window.getComputedStyle(el);
      if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
        visible++;
      }
    });
    return { total: els.length, visible };
  } catch {
    return { total: 0, visible: 0 };
  }
};

export const subscriptionService = {
  /**
   * Dismisses any currently open Razorpay Checkout instance and hides overlay DOM elements.
   */
  dismissActiveCheckout(): void {
    console.log('[Razorpay DEBUG] dismissActiveCheckout invoked.');
    if (activePollIntervalId) {
      clearInterval(activePollIntervalId);
      activePollIntervalId = null;
    }
    if (activeCleanupFn) {
      activeCleanupFn();
    } else {
      hideRazorpayDom();
    }
  },

  /**
   * Evaluates if the recruiter has an active subscription.
   * Handles all Firestore date formats (Timestamp, { seconds }, Date, ISO string).
   */
  isSubscriptionActive(recruiter: Recruiter | null): boolean {
    if (!recruiter || !recruiter.isSubscribed) return false;
    if (recruiter.subscriptionExpiry == null) return true;

    const expiryDate = parseFirestoreDate(recruiter.subscriptionExpiry);
    if (!expiryDate) return false;
    return expiryDate.getTime() > Date.now();
  },

  /**
   * Checks if trial plan is available (only when recruiter has no prior subscription history).
   */
  isTrialEligible(recruiter: Recruiter | null): boolean {
    if (!recruiter) return true;
    return !recruiter.subscriptionPlanId && !recruiter.subscriptionTier;
  },

  /**
   * Securely activates and persists verified subscription state via server-side Cloud Function.
   * Prevents duplicate transaction activations using backend idempotency records.
   */
  async activateSubscription(
    uid: string,
    planId: string,
    paymentResponse: RazorpayResponse
  ): Promise<void> {
    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
    if (!plan) {
      throw new Error(`Invalid subscription plan: ${planId}`);
    }

    const paymentId = paymentResponse.razorpay_payment_id?.trim();
    if (!paymentId) {
      throw new Error('Missing payment identifier from payment gateway.');
    }

    const effectiveUid = uid || auth.currentUser?.uid;
    if (!effectiveUid) {
      throw new Error('Authentication session mismatch. Please sign in again.');
    }

    // Call trusted backend Cloud Function (executes with Admin SDK privileges and verifies HMAC signature & Razorpay status)
    const verifyResult = await functionsService.verifyRazorpayPayment({
      paymentId,
      orderId: paymentResponse.razorpay_order_id || null,
      signature: paymentResponse.razorpay_signature || null,
      planId: plan.id,
    });

    if (!verifyResult || !verifyResult.success) {
      throw new Error(verifyResult?.message || 'Payment verification failed on payment gateway.');
    }
  },

  /**
   * Initiates Razorpay checkout for any selected subscription plan.
   * Strictly requires server-side order creation before opening checkout.
   */
  async initiatePayment(
    planId: string,
    recruiter: Recruiter,
    onSuccess: () => void,
    onFailure: (errorMsg: string) => void
  ): Promise<void> {
    const targetUid = auth.currentUser?.uid || recruiter.uid;
    if (!targetUid) {
      onFailure('You must be signed in to purchase a subscription.');
      return;
    }

    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
    if (!plan) {
      onFailure('Selected subscription plan not found.');
      return;
    }

    if (plan.id === 'trial_60_days_1_rupee' && !this.isTrialEligible(recruiter)) {
      onFailure('The introductory trial plan is only available for new accounts.');
      return;
    }

    const isLoaded = await loadRazorpayScript();
    console.log('[Razorpay DEBUG] SDK loaded =', Boolean(window.Razorpay));

    if (!isLoaded || !window.Razorpay) {
      onFailure('Failed to load secure payment gateway. Please check your internet connection and try again.');
      return;
    }

    // 1. Mandatory Server-Side Order Creation (No order-less fallback)
    let orderId: string;
    try {
      const orderResult = await functionsService.createRazorpayOrder({
        planId: plan.id,
        amountPaise: plan.amountPaise,
        currency: 'INR',
      });
      if (!orderResult?.orderId) {
        throw new Error('No order ID received from payment service.');
      }
      orderId = orderResult.orderId;
    } catch (orderErr: unknown) {
      console.error('[subscriptionService] Mandatory order creation failed:', orderErr);
      onFailure('Unable to initialize secure payment. Please try again.');
      return; // STRICT STOP: Do NOT proceed with order-less payment mode
    }

    type PaymentFlowState =
      | 'checkout_open'
      | 'payment_processing'
      | 'payment_verified'
      | 'payment_failed'
      | 'dismissed';

    let paymentFlowState: PaymentFlowState = 'checkout_open';
    let rzpInstance: RazorpayInstance | null = null;
    let pollIntervalId: ReturnType<typeof setInterval> | null = null;
    let isVerifying = false;
    let pollCount = 0;
    const MAX_POLLS = 360; // 360 * 2.5s = 15 minutes (matches checkout timeout)

    const stopPolling = () => {
      if (pollIntervalId) {
        clearInterval(pollIntervalId);
        pollIntervalId = null;
      }
      if (activePollIntervalId) {
        clearInterval(activePollIntervalId);
        activePollIntervalId = null;
      }
    };

    const closeAndCleanRazorpay = () => {
      stopPolling();
      console.log('[Razorpay DEBUG] closeAndCleanRazorpay called');
      const activeExists = Boolean(rzpInstance || activeRzpInstance);
      console.log(`[Razorpay DEBUG] active rzpInstance exists=${activeExists}`);
      const beforeContainers = countVisibleContainers();
      console.log(`[Razorpay DEBUG] Razorpay container count before close: total=${beforeContainers.total}, visible=${beforeContainers.visible}`);
      console.log(`[Razorpay DEBUG] paymentFlowState before close=${paymentFlowState}`);

      try {
        const targetInstance = rzpInstance || activeRzpInstance;
        if (targetInstance && typeof targetInstance.close === 'function') {
          console.log('[Razorpay DEBUG] calling rzpInstance.close()');
          targetInstance.close();
          console.log('[Razorpay DEBUG] close() returned');
        } else {
          console.log('[Razorpay DEBUG] calling rzpInstance.close() skipped (instance or close method not found)');
        }
      } catch (cErr) {
        console.warn('[Razorpay DEBUG] Note on rzpInstance.close():', cErr);
      }

      // Hide DOM non-destructively without detaching elements to prevent "Node cannot be found in the current page"
      hideRazorpayDom();
      if (typeof window !== 'undefined') {
        window.requestAnimationFrame(() => hideRazorpayDom());
        setTimeout(() => hideRazorpayDom(), 50);
        setTimeout(() => hideRazorpayDom(), 200);
        setTimeout(() => hideRazorpayDom(), 500);
      }

      const afterContainers = countVisibleContainers();
      console.log(`[Razorpay DEBUG] Razorpay container count after close: total=${afterContainers.total}, visible=${afterContainers.visible}`);
      console.log(`[Razorpay DEBUG] visible iframe/container present immediately after close=${afterContainers.visible > 0}`);
      console.log(`[Razorpay DEBUG] paymentFlowState after close=${paymentFlowState}`);

      activeRzpInstance = null;
      activeCleanupFn = null;
    };

    activeCleanupFn = closeAndCleanRazorpay;

    const startPolling = () => {
      stopPolling();
      pollCount = 0;
      console.log(`[Razorpay Flow] Starting 2.5s active order polling loop for order: ${orderId}`);
      pollIntervalId = setInterval(async () => {
        pollCount++;
        if (pollCount > MAX_POLLS) {
          console.log('[Razorpay Flow] Max polling duration reached. Halting polling.');
          stopPolling();
          return;
        }

        // Only poll while checkout is actively open and unresolved
        if (paymentFlowState !== 'checkout_open') {
          console.log(`[Razorpay DEBUG] Polling tick stopped: paymentFlowState is ${paymentFlowState}`);
          stopPolling();
          return;
        }

        if (isVerifying) {
          return; // Skip tick if prior verification call is still in-flight
        }

        isVerifying = true;
        try {
          console.log(`[Razorpay Flow] Polling tick #${pollCount} - verifying order ${orderId}...`);
          const verifyResult = await functionsService.verifyRazorpayPayment({
            orderId,
            planId: plan.id,
          });

          console.log(`[Razorpay Flow] Polling tick #${pollCount} response:`, {
            verified: verifyResult?.verified,
            success: verifyResult?.success,
            failed: verifyResult?.failed,
            pending: verifyResult?.pending,
          });

          if (verifyResult?.verified && verifyResult?.success) {
            console.log('[Razorpay DEBUG] polling verified=true');
            console.log('[Razorpay DEBUG] success branch entered');
            stopPolling();
            paymentFlowState = 'payment_verified';
            closeAndCleanRazorpay();
            onSuccess();
            return;
          }

          if (verifyResult?.failed) {
            console.warn('[Razorpay Flow] SERVER DETECTED PAYMENT FAILURE:', verifyResult.message);
            stopPolling();
            paymentFlowState = 'payment_failed';
            closeAndCleanRazorpay();
            onFailure(verifyResult.message || 'Payment was declined by payment gateway.');
            return;
          }
        } catch (pollErr) {
          if (paymentFlowState !== 'checkout_open') {
            stopPolling();
            return;
          }
          console.warn(`[Razorpay Flow] Polling tick #${pollCount} non-fatal check:`, pollErr);
        } finally {
          isVerifying = false;
        }
      }, 2500);

      activePollIntervalId = pollIntervalId;
    };

    const options: Record<string, unknown> = {
      key: APP_CONFIG.razorpayKeyId,
      amount: plan.amountPaise,
      currency: 'INR',
      name: APP_CONFIG.appName,
      description: `${plan.name} - ${plan.period}`,
      order_id: orderId, // Guaranteed valid server-side order ID
      prefill: {
        name: recruiter.fullName || auth.currentUser?.displayName || 'Recruiter',
        email: recruiter.officialEmail || recruiter.email || auth.currentUser?.email || '',
        contact: recruiter.phoneNumber || recruiter.phone || '',
      },
      theme: {
        color: '#0d9488', // Teal
      },
      retry: {
        enabled: true,
        max_count: 3,
      },
      timeout: 900, // 15-minute checkout window for UPI/app-switch authorizations
      handler: async (response: RazorpayResponse) => {
        console.log('[Razorpay Flow] Razorpay options.handler callback received:', response);
        stopPolling();
        if (paymentFlowState === 'payment_verified') {
          console.log('[Razorpay Flow] Handler invoked but payment already verified via polling.');
          return;
        }
        paymentFlowState = 'payment_processing';
        closeAndCleanRazorpay();

        try {
          if (!response || !response.razorpay_payment_id) {
            throw new Error('Payment was completed but no payment reference ID was returned by payment gateway.');
          }

          // Authoritative server-side signature verification & subscription activation via Cloud Function
          await subscriptionService.activateSubscription(targetUid, plan.id, {
            ...response,
            razorpay_order_id: response.razorpay_order_id || orderId,
          });

          console.log('[Razorpay Flow] Handler signature verification passed. Activating subscription UI.');
          paymentFlowState = 'payment_verified';
          onSuccess();
        } catch (err: unknown) {
          paymentFlowState = 'payment_failed';
          console.error('[Razorpay Flow] Error in handler verification:', err);
          const paymentRef = response?.razorpay_payment_id ? ` (Ref: ${response.razorpay_payment_id})` : '';
          const errMsg = err instanceof Error ? err.message : 'Unknown error';
          onFailure(
            `Payment completed${paymentRef}, but verifying your subscription status encountered an error (${errMsg}). Please contact support with this reference.`
          );
        }
      },
      modal: {
        backdropclose: false,
        escape: false,
        handleback: true,
        confirm_close: false, // Must be FALSE so programmatic rzpInstance.close() is never blocked by a confirmation prompt
        ondismiss: async () => {
          console.log(`[Razorpay Flow] modal.ondismiss triggered with state: ${paymentFlowState}`);
          stopPolling();
          closeAndCleanRazorpay();

          // If payment was already verified or is being processed, do not show cancellation
          if (paymentFlowState === 'payment_verified' || paymentFlowState === 'payment_processing') {
            console.log('[Razorpay Flow] Razorpay modal dismissed (payment already verified/processing).');
            return;
          }
          if (paymentFlowState === 'payment_failed') {
            return;
          }

          // Perform active server-side reconciliation for this order before concluding failure
          try {
            console.log('[Razorpay Flow] Performing pre-dismissal reconciliation check with server...');
            const verifyResult = await functionsService.verifyRazorpayPayment({
              orderId,
              planId: plan.id,
            });
            if (verifyResult?.verified && verifyResult?.success) {
              console.log('[Razorpay Flow] Payment reconciled successfully on modal dismissal!');
              paymentFlowState = 'payment_verified';
              onSuccess();
              return;
            }
            if (verifyResult?.failed) {
              console.log('[Razorpay Flow] Server reported payment failure during modal dismissal.');
              paymentFlowState = 'payment_failed';
              onFailure(verifyResult.message || 'Payment was declined by payment gateway.');
              return;
            }
          } catch (vErr) {
            console.warn('[Razorpay Flow] Note on ondismiss server reconciliation:', vErr);
          }

          // Fallback check on recruiter document in Firestore
          try {
            const recSnap = await getDoc(doc(db, COLLECTIONS.RECRUITERS, targetUid));
            if (recSnap.exists()) {
              const data = recSnap.data() as Recruiter;
              if (subscriptionService.isSubscriptionActive(data)) {
                console.log('[Razorpay Flow] Recruiter subscription detected active during ondismiss fallback check.');
                paymentFlowState = 'payment_verified';
                onSuccess();
                return;
              }
            }
          } catch (rErr) {
            console.warn('[Razorpay Flow] Note on ondismiss status fallback check:', rErr);
          }

          paymentFlowState = 'dismissed';
          onFailure(
            'Payment window was closed. If money was debited from your bank account (e.g. via Google Pay or UPI), please use the "Verify Payment" option below to activate your subscription immediately.'
          );
        },
      },
    };

    try {
      // 1. Reset any leftover style overrides to guarantee normal Checkout rendering
      restoreRazorpayDom();

      console.log('[Razorpay DEBUG] creating Razorpay instance');
      rzpInstance = new window.Razorpay(options);
      activeRzpInstance = rzpInstance;
      console.log('[Razorpay DEBUG] instance created =', Boolean(rzpInstance));

      if (typeof rzpInstance.on === 'function') {
        rzpInstance.on('payment.failed', (response: unknown) => {
          console.warn('[Razorpay Flow] rzpInstance payment.failed event received:', response);
          stopPolling();
          paymentFlowState = 'payment_failed';
          closeAndCleanRazorpay();

          const errObj = (response as { error?: { description?: string; reason?: string; metadata?: { payment_id?: string } } })?.error;
          const failedPaymentId = errObj?.metadata?.payment_id || '';
          const reason = errObj?.description || errObj?.reason || 'Payment was declined by the bank or payment gateway.';
          const refText = failedPaymentId ? ` (Ref: ${failedPaymentId})` : '';

          onFailure(
            `Payment failed: ${reason}${refText}. If money was debited from your bank account, Razorpay will automatically reverse and refund it within 5-7 business days.`
          );
        });
      }

      console.log('[Razorpay DEBUG] calling instance.open()');
      console.log(`[Razorpay Flow] Opening Razorpay Checkout instance for order: ${orderId}`);
      rzpInstance.open();
      console.log('[Razorpay DEBUG] instance.open() returned');
      console.log('[Razorpay DEBUG] paymentFlowState =', paymentFlowState);
      console.log('[Razorpay DEBUG] active Razorpay DOM count =', countVisibleContainers());

      // Start active 2.5s polling loop AFTER checkout window is successfully opened
      startPolling();
    } catch (err) {
      stopPolling();
      console.error('[Razorpay DEBUG] Exception during Razorpay instance creation or open():', err);
      onFailure('Could not open payment window. Please try again.');
    }
  },

  /**
   * Securely verifies and activates a subscription for a payment completed via UPI / Google Pay
   * when the browser gateway iframe was closed or disconnected.
   */
  async verifyAndActivateManualPayment(
    uid: string,
    planId: string,
    paymentIdOrRef: string
  ): Promise<void> {
    const cleanRef = String(paymentIdOrRef || '').trim();
    if (!cleanRef) {
      throw new Error('Please enter a valid Payment ID (starts with pay_).');
    }

    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
    if (!plan) {
      throw new Error('Selected subscription plan not found.');
    }

    const effectiveUid = uid || auth.currentUser?.uid;
    if (!effectiveUid) {
      throw new Error('You must be signed in to verify your subscription.');
    }

    await this.activateSubscription(effectiveUid, plan.id, {
      razorpay_payment_id: cleanRef,
    });
  },

  /**
   * Cancels recruiter subscription renewal.
   */
  async cancelSubscription(recruiterId: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.RECRUITERS, recruiterId);
    await updateDoc(docRef, {
      isSubscriptionCancelled: true,
      updatedAt: serverTimestamp(),
    });
  },
};
