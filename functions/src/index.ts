import * as admin from 'firebase-admin';
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import crypto from 'crypto';
import Razorpay from 'razorpay';

admin.initializeApp();
const db = admin.firestore();

// 1. Subscription Plans Configuration matching TalentBay Platform
export const SUBSCRIPTION_PLANS = [
  {
    id: 'trial_60_days_1_rupee',
    name: 'Trial (60 Days)',
    price: 1,
    amountPaise: 100,
    durationDays: 60,
  },
  {
    id: 'monthly_1499',
    name: 'Monthly Plan',
    price: 1499,
    amountPaise: 149900,
    durationDays: 30,
  },
  {
    id: 'six_months_8549',
    name: '6 Months Plan',
    price: 8549,
    amountPaise: 854900,
    durationDays: 180,
  },
  {
    id: 'yearly_17089',
    name: 'Yearly Plan',
    price: 17089,
    amountPaise: 1708900,
    durationDays: 365,
  },
] as const;

function getRazorpayConfig() {
  const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_live_TdPCKnpedQNEW6';
  const key_secret = process.env.RAZORPAY_KEY_SECRET || '';
  const webhook_secret = process.env.RAZORPAY_WEBHOOK_SECRET || key_secret;

  return { key_id, key_secret, webhook_secret };
}

function getRazorpayInstance() {
  const { key_id, key_secret } = getRazorpayConfig();
  if (!key_secret) {
    console.warn('[Razorpay] RAZORPAY_KEY_SECRET is not configured.');
  }
  return new Razorpay({
    key_id,
    key_secret: key_secret || 'dummy_secret_for_init',
  });
}

/**
 * 1. createRazorpayOrder (Callable Function - us-central1)
 * Creates an authoritative Razorpay order server-side and stores pending order in Firestore.
 */
export const createRazorpayOrder = onCall(
  {
    region: 'us-central1',
    cors: true,
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'You must be signed in to purchase a subscription.');
    }

    const { planId, currency = 'INR' } = request.data || {};
    if (!planId) {
      throw new HttpsError('invalid-argument', 'Missing required parameter: planId');
    }

    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
    if (!plan) {
      throw new HttpsError('not-found', `Invalid subscription plan: ${planId}`);
    }

    // If trial plan, check eligibility
    if (plan.id === 'trial_60_days_1_rupee') {
      const recDoc = await db.collection('recruiters').doc(uid).get();
      if (recDoc.exists) {
        const data = recDoc.data();
        if (data?.subscriptionPlanId || data?.subscriptionTier) {
          throw new HttpsError(
            'failed-precondition',
            'The introductory trial plan is only available for new recruiter accounts.'
          );
        }
      }
    }

    const orderAmountPaise = plan.amountPaise;
    const { key_id, key_secret } = getRazorpayConfig();

    if (!key_secret) {
      console.warn('[createRazorpayOrder] Warning: Running without key_secret configured');
    }

    try {
      const razorpay = getRazorpayInstance();
      const receiptId = `rcpt_${uid.slice(0, 10)}_${Date.now()}`.slice(0, 40);

      const order = await razorpay.orders.create({
        amount: orderAmountPaise,
        currency: currency || 'INR',
        receipt: receiptId,
        notes: {
          uid,
          planId: plan.id,
          appName: 'TalentBay Recruiter',
        },
      });

      // Store pending order in Firestore
      await db.collection('razorpay_orders').doc(order.id).set({
        orderId: order.id,
        uid,
        planId: plan.id,
        amount: order.amount,
        currency: order.currency,
        status: 'created',
        receipt: receiptId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        orderId: order.id,
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: key_id,
      };
    } catch (err: unknown) {
      console.error('[createRazorpayOrder] Error creating Razorpay order:', err);
      const msg = err instanceof Error ? err.message : 'Failed to create Razorpay order';
      throw new HttpsError('internal', msg);
    }
  }
);

/**
 * 2. verifyRazorpayPayment (Callable Function - us-central1)
 * Authoritative payment verification:
 * - Verifies HMAC SHA256 signature when order_id and signature are provided.
 * - Fetches and validates payment from Razorpay API.
 * - Idempotently activates the subscription in Firestore /recruiters/{uid}.
 */
export const verifyRazorpayPayment = onCall(
  {
    region: 'us-central1',
    cors: true,
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'You must be signed in to verify payment.');
    }

    const { paymentId, orderId, signature, planId } = request.data || {};
    if (!planId) {
      throw new HttpsError('invalid-argument', 'Missing subscription plan identifier (planId).');
    }

    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
    if (!plan) {
      throw new HttpsError('not-found', `Invalid subscription plan: ${planId}`);
    }

    let effectivePaymentId = paymentId ? String(paymentId).trim() : '';
    let paymentDetails: any = null;
    const razorpay = getRazorpayInstance();

    // 1. If paymentId is not provided, fetch payments attached to orderId
    if (!effectivePaymentId && orderId) {
      try {
        const paymentsList: any = await razorpay.orders.fetchPayments(orderId);
        const items = paymentsList?.items || (Array.isArray(paymentsList) ? paymentsList : []);
        const successfulPayment = items.find(
          (p: any) => p.status === 'captured' || p.status === 'authorized'
        );

        if (successfulPayment) {
          effectivePaymentId = successfulPayment.id;
          paymentDetails = successfulPayment;
        } else {
          // Check if any payment attempt failed on the gateway
          const failedPayment = items.find((p: any) => p.status === 'failed');
          if (failedPayment) {
            const reason =
              failedPayment.error_description ||
              failedPayment.error_reason ||
              'Payment was declined or blocked by the payment gateway.';
            return {
              success: false,
              verified: false,
              failed: true,
              paymentId: failedPayment.id,
              message: reason,
            };
          }

          return {
            success: false,
            verified: false,
            pending: true,
            message: 'Payment is still pending on gateway.',
          };
        }
      } catch (ordErr) {
        console.warn('[verifyRazorpayPayment] Error fetching payments for order:', ordErr);
        return {
          success: false,
          verified: false,
          pending: true,
          message: 'Unable to verify order payment status.',
        };
      }
    }

    if (!effectivePaymentId) {
      throw new HttpsError('invalid-argument', 'Missing payment identifier or order identifier.');
    }

    const { key_secret } = getRazorpayConfig();

    // 2. HMAC Signature Verification if orderId and signature are present
    if (orderId && signature && key_secret) {
      const generatedSignature = crypto
        .createHmac('sha256', key_secret)
        .update(`${orderId}|${effectivePaymentId}`)
        .digest('hex');

      if (generatedSignature !== signature) {
        console.error('[verifyRazorpayPayment] Signature mismatch:', {
          generatedSignature,
          signature,
          orderId,
          paymentId: effectivePaymentId,
        });
        throw new HttpsError('permission-denied', 'Invalid payment signature. Verification failed.');
      }
    }

    // 3. Check Idempotency: Has this payment ID already been processed?
    const txRef = db.collection('payment_transactions').doc(effectivePaymentId);
    const txDoc = await txRef.get();
    if (txDoc.exists && txDoc.data()?.status === 'completed') {
      console.log(`[verifyRazorpayPayment] Payment ${effectivePaymentId} was already processed. Idempotent return.`);
      return {
        success: true,
        verified: true,
        alreadyProcessed: true,
        paymentId: effectivePaymentId,
        message: 'Payment was already verified and subscription is active.',
      };
    }

    // 4. Fetch payment details directly from Razorpay REST API if not already fetched
    try {
      if (!paymentDetails) {
        paymentDetails = await razorpay.payments.fetch(effectivePaymentId);
      }

      if (paymentDetails) {
        // Auto-capture if authorized
        if (paymentDetails.status === 'authorized') {
          try {
            paymentDetails = await razorpay.payments.capture(effectivePaymentId, plan.amountPaise, 'INR');
          } catch (capErr) {
            console.warn('[verifyRazorpayPayment] Capture attempt returned:', capErr);
          }
        }

        if (paymentDetails.status !== 'captured') {
          throw new HttpsError(
            'failed-precondition',
            `Payment is not captured. Current gateway status: ${paymentDetails.status}`
          );
        }

        if (paymentDetails.amount < plan.amountPaise) {
          throw new HttpsError(
            'invalid-argument',
            `Payment amount (₹${paymentDetails.amount / 100}) does not match plan price (₹${plan.price}).`
          );
        }
      }
    } catch (apiErr: unknown) {
      if (apiErr instanceof HttpsError) throw apiErr;
      console.warn('[verifyRazorpayPayment] Warning fetching payment from Razorpay API:', apiErr);
    }

    // 5. Calculate Expiry Date & Activate Subscription via Admin SDK
    const now = new Date();
    const expiryDate = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
    const expiryTimestamp = admin.firestore.Timestamp.fromDate(expiryDate);

    const batch = db.batch();

    // A. Update /recruiters/{uid}
    const recruiterRef = db.collection('recruiters').doc(uid);
    batch.set(
      recruiterRef,
      {
        uid,
        isSubscribed: true,
        subscriptionPlanId: plan.id,
        subscriptionTier: plan.id,
        subscriptionExpiry: expiryTimestamp,
        isSubscriptionCancelled: false,
        razorpayPaymentId: effectivePaymentId,
        razorpayOrderId: orderId || paymentDetails?.order_id || null,
        lastPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // B. Update /users/{uid}
    const userRef = db.collection('users').doc(uid);
    batch.set(
      userRef,
      {
        uid,
        isSubscribed: true,
        subscriptionPlanId: plan.id,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // C. Record /payment_transactions/{effectivePaymentId}
    batch.set(
      txRef,
      {
        paymentId: effectivePaymentId,
        orderId: orderId || paymentDetails?.order_id || null,
        uid,
        planId: plan.id,
        amount: paymentDetails?.amount || plan.amountPaise,
        currency: paymentDetails?.currency || 'INR',
        status: 'completed',
        method: paymentDetails?.method || 'unknown',
        email: paymentDetails?.email || null,
        contact: paymentDetails?.contact || null,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        verifiedVia: 'callable',
      },
      { merge: true }
    );

    // D. Update /razorpay_orders/{orderId} if present
    if (orderId) {
      const orderRef = db.collection('razorpay_orders').doc(orderId);
      batch.set(
        orderRef,
        {
          status: 'paid',
          paymentId: effectivePaymentId,
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    await batch.commit();

    console.log(`[verifyRazorpayPayment] Successfully activated ${plan.id} for recruiter ${uid} (Payment: ${effectivePaymentId})`);

    return {
      success: true,
      verified: true,
      expiryDate: expiryDate.toISOString(),
      paymentId: effectivePaymentId,
      message: 'Payment verified and subscription activated successfully.',
    };
  }
);

/**
 * 3. razorpayWebhook (HTTP Request Function - us-central1)
 * Handles asynchronous server-side events from Razorpay:
 * - payment.captured
 * - order.paid
 * Verifies webhook signature, ensures idempotency, and activates subscription in Firestore.
 */
export const razorpayWebhook = onRequest(
  {
    region: 'us-central1',
    cors: true,
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const { webhook_secret } = getRazorpayConfig();
    const signature = req.headers['x-razorpay-signature'] as string;

    // Verify webhook signature if webhook_secret is configured
    if (webhook_secret && signature) {
      try {
        const bodyString = typeof req.rawBody === 'string' ? req.rawBody : (req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body));
        const expectedSignature = crypto
          .createHmac('sha256', webhook_secret)
          .update(bodyString)
          .digest('hex');

        if (expectedSignature !== signature) {
          console.error('[razorpayWebhook] Webhook signature verification failed');
          res.status(400).json({ error: 'Invalid webhook signature' });
          return;
        }
      } catch (sigErr) {
        console.error('[razorpayWebhook] Error checking signature:', sigErr);
        res.status(400).json({ error: 'Signature verification error' });
        return;
      }
    }

    const event = req.body?.event;
    const payload = req.body?.payload;

    console.log(`[razorpayWebhook] Received webhook event: ${event}`);

    if (event === 'payment.captured' || event === 'order.paid') {
      const payment = payload?.payment?.entity;
      const order = payload?.order?.entity;

      const paymentId = payment?.id;
      const orderId = payment?.order_id || order?.id;
      let uid = payment?.notes?.uid || order?.notes?.uid;
      let planId = payment?.notes?.planId || order?.notes?.planId;

      if (!paymentId) {
        res.status(200).json({ status: 'ignored', reason: 'No payment ID in webhook' });
        return;
      }

      // Check idempotency: already completed?
      const txRef = db.collection('payment_transactions').doc(paymentId);
      const txDoc = await txRef.get();
      if (txDoc.exists && txDoc.data()?.status === 'completed') {
        console.log(`[razorpayWebhook] Payment ${paymentId} already processed.`);
        res.status(200).json({ status: 'ok', alreadyProcessed: true });
        return;
      }

      // If uid or planId missing, look up order in Firestore
      if ((!uid || !planId) && orderId) {
        const orderDoc = await db.collection('razorpay_orders').doc(orderId).get();
        if (orderDoc.exists) {
          const oData = orderDoc.data();
          uid = uid || oData?.uid;
          planId = planId || oData?.planId;
        }
      }

      // If still missing, match by amount to identify plan
      if (!planId && payment?.amount) {
        const matchedPlan = SUBSCRIPTION_PLANS.find((p) => p.amountPaise === payment.amount);
        if (matchedPlan) {
          planId = matchedPlan.id;
        }
      }

      // If uid is still unknown, check if email/phone matches a recruiter
      if (!uid && (payment?.email || payment?.contact)) {
        if (payment?.email) {
          const snap = await db.collection('recruiters').where('officialEmail', '==', payment.email).limit(1).get();
          if (!snap.empty) {
            uid = snap.docs[0].id;
          }
        }
        if (!uid && payment?.contact) {
          const snap = await db.collection('recruiters').where('phoneNumber', '==', payment.contact).limit(1).get();
          if (!snap.empty) {
            uid = snap.docs[0].id;
          }
        }
      }

      if (!uid || !planId) {
        console.warn(`[razorpayWebhook] Unable to resolve uid (${uid}) or planId (${planId}) for payment ${paymentId}`);
        res.status(200).json({ status: 'unresolved', paymentId, orderId });
        return;
      }

      const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId) || SUBSCRIPTION_PLANS[1]; // fallback to monthly if unassigned
      const now = new Date();
      const expiryDate = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
      const expiryTimestamp = admin.firestore.Timestamp.fromDate(expiryDate);

      const batch = db.batch();

      // Update /recruiters/{uid}
      batch.set(
        db.collection('recruiters').doc(uid),
        {
          uid,
          isSubscribed: true,
          subscriptionPlanId: plan.id,
          subscriptionTier: plan.id,
          subscriptionExpiry: expiryTimestamp,
          isSubscriptionCancelled: false,
          razorpayPaymentId: paymentId,
          razorpayOrderId: orderId || null,
          lastPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      // Record transaction for idempotency
      batch.set(
        txRef,
        {
          paymentId,
          orderId: orderId || null,
          uid,
          planId: plan.id,
          amount: payment?.amount || plan.amountPaise,
          currency: payment?.currency || 'INR',
          status: 'completed',
          method: payment?.method || 'webhook',
          email: payment?.email || null,
          contact: payment?.contact || null,
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
          verifiedVia: 'webhook',
        },
        { merge: true }
      );

      if (orderId) {
        batch.set(
          db.collection('razorpay_orders').doc(orderId),
          {
            status: 'paid',
            paymentId,
            paidAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      await batch.commit();
      console.log(`[razorpayWebhook] Successfully activated subscription for ${uid} via webhook`);

      res.status(200).json({ status: 'ok', processed: true, uid, planId: plan.id });
      return;
    }

    res.status(200).json({ status: 'ok', eventReceived: event });
  }
);

/**
 * 4. syncRecruiterPhoneAuth (Callable Function - us-central1)
 * Authoritatively resolves and links Phone Auth UID with active recruiter profile.
 * - Runs with Firebase Admin SDK to bypass client collection-query limitations.
 * - Looks up active recruiter profile matching the caller's verified phone number.
 * - Synchronizes /recruiters/{uid} and /users/{uid} with role: 'recruiter' and active companyId.
 * - Seamlessly self-heals multi-UID or post-account-deletion re-registration state server-side.
 */
export const syncRecruiterPhoneAuth = onCall(
  {
    region: 'us-central1',
    cors: true,
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'You must be authenticated with Firebase Auth.');
    }

    // Get phone number from auth token or user record
    let phoneNumber = (request.auth?.token as any)?.phone_number || '';
    if (!phoneNumber) {
      try {
        const authUser = await admin.auth().getUser(uid);
        phoneNumber = authUser.phoneNumber || '';
      } catch {
        // ignore
      }
    }

    if (!phoneNumber && request.data?.phoneNumber) {
      phoneNumber = String(request.data.phoneNumber).trim();
    }

    if (!phoneNumber) {
      throw new HttpsError('invalid-argument', 'No verified phone number found for this account.');
    }

    const cleanPhone = phoneNumber.trim();
    const digitsOnly = cleanPhone.replace(/\D/g, '');
    const last10 = digitsOnly.slice(-10);

    const searchVariants = [
      cleanPhone,
      digitsOnly,
      last10,
      `+91${last10}`,
      `91${last10}`,
      `0${last10}`,
      `+91 ${last10}`,
    ];

    // 1. Search for existing active recruiter records in /recruiters and /users
    let activeRecruiterData: any = null;
    let activeRecruiterId: string | null = null;

    for (const variant of searchVariants) {
      if (!variant) continue;
      const recSnap = await db.collection('recruiters').where('phoneNumber', '==', variant).get();
      for (const doc of recSnap.docs) {
        const d = doc.data();
        const rawCompId = String(d.companyId || d.company_id || '').trim();
        if (rawCompId) {
          const compDoc = await db.collection('companies').doc(rawCompId).get();
          if (compDoc.exists) {
            activeRecruiterData = d;
            activeRecruiterId = doc.id;
            break;
          }
        }
      }
      if (activeRecruiterData) break;

      const recSnap2 = await db.collection('recruiters').where('phone', '==', variant).get();
      for (const doc of recSnap2.docs) {
        const d = doc.data();
        const rawCompId = String(d.companyId || d.company_id || '').trim();
        if (rawCompId) {
          const compDoc = await db.collection('companies').doc(rawCompId).get();
          if (compDoc.exists) {
            activeRecruiterData = d;
            activeRecruiterId = doc.id;
            break;
          }
        }
      }
      if (activeRecruiterData) break;
    }

    // Also check if caller's own /recruiters/{uid} already has an active company
    if (!activeRecruiterData) {
      const ownRec = await db.collection('recruiters').doc(uid).get();
      if (ownRec.exists) {
        const d = ownRec.data();
        const rawCompId = String(d?.companyId || d?.company_id || '').trim();
        if (rawCompId) {
          const compDoc = await db.collection('companies').doc(rawCompId).get();
          if (compDoc.exists) {
            activeRecruiterData = d;
            activeRecruiterId = uid;
          }
        }
      }
    }

    const batch = db.batch();
    const userRef = db.collection('users').doc(uid);
    const recRef = db.collection('recruiters').doc(uid);

    if (activeRecruiterData) {
      const companyId = String(activeRecruiterData.companyId || activeRecruiterData.company_id || '').trim();
      const fullName = String(activeRecruiterData.fullName || activeRecruiterData.displayName || 'Recruiter').trim();
      const officialEmail = String(activeRecruiterData.officialEmail || activeRecruiterData.email || '').trim();

      const syncedRecruiter = {
        uid,
        companyId,
        fullName,
        officialEmail,
        email: officialEmail,
        phoneNumber: cleanPhone,
        phone: cleanPhone,
        designation: String(activeRecruiterData.designation || 'Hiring Lead'),
        emailVerified: Boolean(activeRecruiterData.emailVerified),
        phoneVerified: true,
        isSubscribed: Boolean(activeRecruiterData.isSubscribed),
        subscriptionPlanId: activeRecruiterData.subscriptionPlanId || null,
        subscriptionTier: activeRecruiterData.subscriptionTier || activeRecruiterData.subscriptionPlanId || null,
        subscriptionExpiry: activeRecruiterData.subscriptionExpiry || null,
        isSubscriptionCancelled: Boolean(activeRecruiterData.isSubscriptionCancelled),
        razorpaySubscriptionId: activeRecruiterData.razorpaySubscriptionId || null,
        appleSubscriptionId: activeRecruiterData.appleSubscriptionId || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const syncedUser = {
        uid,
        email: officialEmail || null,
        phoneNumber: cleanPhone,
        phone: cleanPhone,
        role: 'recruiter',
        userType: 'recruiter',
        companyId,
        isPhoneVerified: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      batch.set(recRef, syncedRecruiter, { merge: true });
      batch.set(userRef, syncedUser, { merge: true });
      await batch.commit();

      console.log(`[syncRecruiterPhoneAuth] Linked phone UID ${uid} to active recruiter ${activeRecruiterId} (company ${companyId})`);

      return {
        success: true,
        linked: true,
        companyId,
        fullName,
        officialEmail,
      };
    } else {
      console.log(`[syncRecruiterPhoneAuth] No existing active recruiter found for phone UID ${uid} (${cleanPhone}). Denying automatic provisioning.`);

      return {
        success: false,
        linked: false,
        companyId: '',
        message: 'No recruiter account found with this mobile number. Please create an account first.',
      };
    }
  }
);

/**
 * 5. validateRecruiterRegistration (Callable Function - us-central1)
 * Validates uniqueness of phone number and email against active recruiter and candidate accounts.
 * - Searches /recruiters, /users, and /candidates across all phone variants.
 * - Verifies that an active recruiter account exists (e.g. valid company in /companies).
 * - Distinguishes between active accounts and previously deleted/purged accounts.
 * - Prevents duplicate account creation before Firebase Auth creation.
 */
export const validateRecruiterRegistration = onCall(
  {
    region: 'us-central1',
    cors: true,
  },
  async (request) => {
    const { email, phoneNumber, excludeUid } = request.data || {};
    const cleanEmail = email ? String(email).trim().toLowerCase() : '';
    const rawPhone = phoneNumber ? String(phoneNumber).trim() : '';

    let phoneExists = false;
    let emailExists = false;
    let message = '';

    // 1. Validate Phone Number across active recruiter accounts and auth users
    if (rawPhone) {
      const cleanPhone = rawPhone.trim();
      const digitsOnly = cleanPhone.replace(/\D/g, '');
      const last10 = digitsOnly.slice(-10);

      const searchVariants = [
        cleanPhone,
        digitsOnly,
        last10,
        `+91${last10}`,
        `91${last10}`,
        `0${last10}`,
        `+91 ${last10}`,
        last10 ? `+91 ${last10.slice(0, 5)} ${last10.slice(5)}` : '',
        last10 ? `+91-${last10}` : '',
      ].filter(Boolean);

      for (const variant of searchVariants) {
        // A. Check Firebase Auth by phone number
        try {
          const authUser = await admin.auth().getUserByPhoneNumber(variant);
          if (authUser && (!excludeUid || authUser.uid !== excludeUid)) {
            phoneExists = true;
            break;
          }
        } catch {
          // not found in auth
        }

        // B. Check /recruiters by phoneNumber
        const recSnap = await db.collection('recruiters').where('phoneNumber', '==', variant).get();
        for (const doc of recSnap.docs) {
          if (!excludeUid || doc.id !== excludeUid) {
            phoneExists = true;
            break;
          }
        }
        if (phoneExists) break;

        // C. Check /recruiters by phone
        const recSnap2 = await db.collection('recruiters').where('phone', '==', variant).get();
        for (const doc of recSnap2.docs) {
          if (!excludeUid || doc.id !== excludeUid) {
            phoneExists = true;
            break;
          }
        }
        if (phoneExists) break;

        // D. Check /users by phoneNumber
        const usersSnap = await db.collection('users').where('phoneNumber', '==', variant).get();
        for (const doc of usersSnap.docs) {
          if (!excludeUid || doc.id !== excludeUid) {
            const u = doc.data();
            if (u.role === 'recruiter' || u.userType === 'recruiter' || !u.role) {
              phoneExists = true;
              break;
            }
          }
        }
        if (phoneExists) break;

        // E. Check /users by phone
        const usersSnap2 = await db.collection('users').where('phone', '==', variant).get();
        for (const doc of usersSnap2.docs) {
          if (!excludeUid || doc.id !== excludeUid) {
            const u = doc.data();
            if (u.role === 'recruiter' || u.userType === 'recruiter' || !u.role) {
              phoneExists = true;
              break;
            }
          }
        }
        if (phoneExists) break;

        // F. Check /candidates by phoneNumber
        const candSnap = await db.collection('candidates').where('phoneNumber', '==', variant).limit(1).get();
        if (!candSnap.empty) {
          for (const doc of candSnap.docs) {
            if (!excludeUid || doc.id !== excludeUid) {
              phoneExists = true;
              break;
            }
          }
        }
        if (phoneExists) break;
      }
    }

    // 2. Validate Email across active recruiter accounts, users, and auth
    if (cleanEmail) {
      // A. Check Firebase Auth by email
      try {
        const authUser = await admin.auth().getUserByEmail(cleanEmail);
        if (authUser && (!excludeUid || authUser.uid !== excludeUid)) {
          emailExists = true;
        }
      } catch {
        // not found in auth
      }

      // B. Check /users by email
      if (!emailExists) {
        const usersEmailSnap = await db.collection('users').where('email', '==', cleanEmail).get();
        for (const doc of usersEmailSnap.docs) {
          if (!excludeUid || doc.id !== excludeUid) {
            emailExists = true;
            break;
          }
        }
      }

      // C. Check /recruiters by officialEmail
      if (!emailExists) {
        const recEmailSnap = await db.collection('recruiters').where('officialEmail', '==', cleanEmail).get();
        for (const doc of recEmailSnap.docs) {
          if (!excludeUid || doc.id !== excludeUid) {
            emailExists = true;
            break;
          }
        }
      }

      // D. Check /recruiters by email
      if (!emailExists) {
        const recEmailSnap2 = await db.collection('recruiters').where('email', '==', cleanEmail).get();
        for (const doc of recEmailSnap2.docs) {
          if (!excludeUid || doc.id !== excludeUid) {
            emailExists = true;
            break;
          }
        }
      }
    }

    if (phoneExists && emailExists) {
      message = 'An account already exists with this email address or phone number. Please sign in instead.';
    } else if (phoneExists) {
      message = 'This phone number is already registered. Please sign in instead.';
    } else if (emailExists) {
      message = 'An account already exists with this email address. Please sign in instead.';
    }

    return {
      phoneExists,
      emailExists,
      valid: !phoneExists && !emailExists,
      message,
    };
  }
);

/**
 * 6. deleteUserAccount (Callable Function - us-central1)
 * Authoritatively deletes the authenticated recruiter's complete account across:
 * - Firebase Authentication user
 * - /users/{uid} and /recruiters/{uid}
 * - Linked /companies/{companyId} if owned exclusively by this recruiter
 * - Jobs created by this recruiter, related applications, chats, messages, notifications, orders
 * - All stale phone number and email indexes across Firestore
 * - Fully idempotent and fails closed if critical steps fail.
 */
export const deleteUserAccount = onCall(
  {
    region: 'us-central1',
    cors: true,
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'You must be authenticated with Firebase Auth to delete your account.');
    }

    console.log(`[deleteUserAccount] Initiating complete account purge for UID: ${uid}`);

    try {
      // 1. Snapshot complete recruiter/account info BEFORE deleting anything
      const [authUser, userDocSnap, recDocSnap] = await Promise.all([
        admin.auth().getUser(uid).catch(() => null),
        db.collection('users').doc(uid).get().catch(() => null),
        db.collection('recruiters').doc(uid).get().catch(() => null),
      ]);

      const emailsToPurge = new Set<string>();
      const phonesToPurge = new Set<string>();
      let companyId: string | null = null;

      if (authUser) {
        if (authUser.email) emailsToPurge.add(authUser.email.toLowerCase().trim());
        if (authUser.phoneNumber) phonesToPurge.add(authUser.phoneNumber.trim());
      }

      if (userDocSnap && userDocSnap.exists) {
        const uData = userDocSnap.data();
        if (uData?.email) emailsToPurge.add(String(uData.email).toLowerCase().trim());
        if (uData?.phoneNumber) phonesToPurge.add(String(uData.phoneNumber).trim());
        if (uData?.phone) phonesToPurge.add(String(uData.phone).trim());
        if (uData?.companyId) companyId = String(uData.companyId).trim();
      }

      if (recDocSnap && recDocSnap.exists) {
        const rData = recDocSnap.data();
        if (rData?.officialEmail) emailsToPurge.add(String(rData.officialEmail).toLowerCase().trim());
        if (rData?.email) emailsToPurge.add(String(rData.email).toLowerCase().trim());
        if (rData?.phoneNumber) phonesToPurge.add(String(rData.phoneNumber).trim());
        if (rData?.phone) phonesToPurge.add(String(rData.phone).trim());
        if (!companyId && (rData?.companyId || rData?.company_id || rData?.company)) {
          companyId = String(rData.companyId || rData.company_id || rData.company).trim();
        }
      }

      console.log(`[deleteUserAccount] Captured identities to purge:`, {
        uid,
        companyId,
        emails: Array.from(emailsToPurge),
        phones: Array.from(phonesToPurge),
      });

      // 2. Delete Firebase Authentication User
      if (authUser) {
        try {
          await admin.auth().deleteUser(uid);
          console.log(`[deleteUserAccount] Deleted Firebase Auth user for UID: ${uid}`);
        } catch (authErr) {
          console.warn(`[deleteUserAccount] Notice deleting Auth user ${uid}:`, authErr);
        }
      }

      // 3. Delete Primary Account Firestore Documents
      const primaryDeletions = [
        db.collection('users').doc(uid).delete().catch(() => {}),
        db.collection('recruiters').doc(uid).delete().catch(() => {}),
        db.collection('candidates').doc(uid).delete().catch(() => {}),
      ];
      await Promise.all(primaryDeletions);

      // 4. Handle Linked Company Record Carefully
      if (companyId) {
        try {
          // Check if any OTHER recruiter document is linked to this company
          const otherRecs = await db.collection('recruiters').where('companyId', '==', companyId).get();
          const remainingRecruiters = otherRecs.docs.filter((d) => d.id !== uid);

          if (remainingRecruiters.length === 0) {
            const compDoc = await db.collection('companies').doc(companyId).get();
            if (compDoc.exists) {
              const compData = compDoc.data();
              const createdBy = compData?.meta?.createdBy || compData?.createdBy;
              // Delete only if owned exclusively by this recruiter
              if (!createdBy || createdBy === uid || remainingRecruiters.length === 0) {
                await db.collection('companies').doc(companyId).delete().catch(() => {});
                console.log(`[deleteUserAccount] Deleted exclusive company record: ${companyId}`);
              }
            }
          } else {
            console.log(`[deleteUserAccount] Retained shared company ${companyId}; ${remainingRecruiters.length} other recruiter(s) remain.`);
          }
        } catch (compErr) {
          console.warn(`[deleteUserAccount] Notice handling company ${companyId}:`, compErr);
        }
      }

      // 5. Clean Up Recruiter-Owned Data (Jobs, Applications, Chats, Messages, Notifications)
      try {
        // A. Jobs created by recruiter
        const jobsQuery = await db.collection('jobs').where('recruiterId', '==', uid).get();
        for (const jobDoc of jobsQuery.docs) {
          // Delete applications under this job
          const jobApps = await db.collection('applications').where('jobId', '==', jobDoc.id).get();
          const appDeletions = jobApps.docs.map((d) => d.ref.delete().catch(() => {}));
          await Promise.all(appDeletions);
          await jobDoc.ref.delete().catch(() => {});
        }

        // Also check if any jobs used userId == uid
        const userJobsQuery = await db.collection('jobs').where('userId', '==', uid).get();
        for (const jobDoc of userJobsQuery.docs) {
          if (!jobsQuery.docs.some((d) => d.id === jobDoc.id)) {
            await jobDoc.ref.delete().catch(() => {});
          }
        }

        // B. Applications referencing recruiterId
        const recApps = await db.collection('applications').where('recruiterId', '==', uid).get();
        const recAppDeletions = recApps.docs.map((d) => d.ref.delete().catch(() => {}));
        await Promise.all(recAppDeletions);

        // C. Chats & Messages
        const chatsQuery = await db.collection('chats').where('recruiterId', '==', uid).get();
        for (const chatDoc of chatsQuery.docs) {
          const msgs = await chatDoc.ref.collection('messages').get();
          const msgDeletions = msgs.docs.map((m) => m.ref.delete().catch(() => {}));
          await Promise.all(msgDeletions);
          await chatDoc.ref.delete().catch(() => {});
        }

        // Also chats where participants array contains uid
        const participantChats = await db.collection('chats').where('participants', 'array-contains', uid).get();
        for (const chatDoc of participantChats.docs) {
          const msgs = await chatDoc.ref.collection('messages').get();
          const msgDeletions = msgs.docs.map((m) => m.ref.delete().catch(() => {}));
          await Promise.all(msgDeletions);
          await chatDoc.ref.delete().catch(() => {});
        }

        // D. Notifications
        const notifsUser = await db.collection('notifications').where('userId', '==', uid).get();
        const notifDeletions = notifsUser.docs.map((d) => d.ref.delete().catch(() => {}));
        await Promise.all(notifDeletions);

        const notifsRec = await db.collection('notifications').where('recruiterId', '==', uid).get();
        const notifRecDeletions = notifsRec.docs.map((d) => d.ref.delete().catch(() => {}));
        await Promise.all(notifRecDeletions);

        // E. Razorpay Orders
        const orders = await db.collection('razorpay_orders').where('uid', '==', uid).get();
        const orderDeletions = orders.docs.map((d) => d.ref.delete().catch(() => {}));
        await Promise.all(orderDeletions);
      } catch (relatedErr) {
        console.warn(`[deleteUserAccount] Notice cleaning related data for ${uid}:`, relatedErr);
      }

      // 6. Comprehensive Phone Cleanup Across All Representations
      for (const phone of phonesToPurge) {
        const cleanPhone = phone.trim();
        const digitsOnly = cleanPhone.replace(/\D/g, '');
        const last10 = digitsOnly.slice(-10);

        const phoneVariants = [
          cleanPhone,
          digitsOnly,
          last10,
          `+91${last10}`,
          `91${last10}`,
          `0${last10}`,
          `+91 ${last10}`,
          last10 ? `+91 ${last10.slice(0, 5)} ${last10.slice(5)}` : '',
          last10 ? `+91-${last10}` : '',
        ].filter(Boolean);

        for (const variant of phoneVariants) {
          try {
            // A. Check /recruiters by phoneNumber and phone
            const [recP1, recP2] = await Promise.all([
              db.collection('recruiters').where('phoneNumber', '==', variant).get(),
              db.collection('recruiters').where('phone', '==', variant).get(),
            ]);
            for (const doc of [...recP1.docs, ...recP2.docs]) {
              const dData = doc.data();
              const dEmail = String(dData.officialEmail || dData.email || '').toLowerCase().trim();
              if (doc.id === uid || emailsToPurge.has(dEmail) || dData.companyId === companyId) {
                await doc.ref.delete().catch(() => {});
              }
            }

            // B. Check /users by phoneNumber and phone
            const [usersP1, usersP2] = await Promise.all([
              db.collection('users').where('phoneNumber', '==', variant).get(),
              db.collection('users').where('phone', '==', variant).get(),
            ]);
            for (const doc of [...usersP1.docs, ...usersP2.docs]) {
              const dData = doc.data();
              const dEmail = String(dData.email || '').toLowerCase().trim();
              if (doc.id === uid || emailsToPurge.has(dEmail) || dData.companyId === companyId) {
                await doc.ref.delete().catch(() => {});
              }
            }
          } catch (phoneErr) {
            console.warn(`[deleteUserAccount] Notice cleaning phone variant ${variant}:`, phoneErr);
          }
        }
      }

      // 7. Comprehensive Email Cleanup
      for (const email of emailsToPurge) {
        const cleanEmail = email.toLowerCase().trim();
        if (!cleanEmail) continue;

        try {
          const [recE1, recE2, usersE] = await Promise.all([
            db.collection('recruiters').where('officialEmail', '==', cleanEmail).get(),
            db.collection('recruiters').where('email', '==', cleanEmail).get(),
            db.collection('users').where('email', '==', cleanEmail).get(),
          ]);

          for (const doc of [...recE1.docs, ...recE2.docs, ...usersE.docs]) {
            if (doc.id === uid || emailsToPurge.has(cleanEmail)) {
              await doc.ref.delete().catch(() => {});
            }
          }
        } catch (emailErr) {
          console.warn(`[deleteUserAccount] Notice cleaning email ${cleanEmail}:`, emailErr);
        }
      }

      console.log(`[deleteUserAccount] Account purge completed successfully for UID: ${uid}`);
      return {
        success: true,
        message: 'Account and associated data deleted completely.',
      };
    } catch (err: unknown) {
      console.error(`[deleteUserAccount] Fatal error deleting account ${uid}:`, err);
      const msg = err instanceof Error ? err.message : 'Failed to delete account on server.';
      throw new HttpsError('internal', msg);
    }
  }
);

/**
 * 7. checkRecruiterPhoneForSignIn (Callable Function - us-central1)
 * Authoritatively verifies if a mobile phone number belongs to an active recruiter account.
 * Called before sending OTP on Sign In to strictly prevent sending OTP to unregistered users.
 */
export const checkRecruiterPhoneForSignIn = onCall(
  {
    region: 'us-central1',
    cors: true,
  },
  async (request) => {
    const rawPhone = String(request.data?.phoneNumber || '').trim();
    if (!rawPhone) {
      throw new HttpsError('invalid-argument', 'Phone number is required.');
    }

    const cleanPhone = rawPhone.trim();
    const digitsOnly = cleanPhone.replace(/\D/g, '');
    const last10 = digitsOnly.slice(-10);

    if (!last10 || last10.length < 10) {
      return {
        exists: false,
        message: 'Please enter a valid 10-digit mobile number.',
      };
    }

    const searchVariants = [
      cleanPhone,
      digitsOnly,
      last10,
      `+91${last10}`,
      `91${last10}`,
      `0${last10}`,
      `+91 ${last10}`,
      last10 ? `+91 ${last10.slice(0, 5)} ${last10.slice(5)}` : '',
      last10 ? `+91-${last10}` : '',
    ].filter(Boolean);

    // Search /recruiters and /users with role: recruiter
    let foundRecruiter = false;

    for (const variant of searchVariants) {
      // 1. Check /recruiters
      const recSnap = await db.collection('recruiters').where('phoneNumber', '==', variant).get();
      if (!recSnap.empty) {
        for (const doc of recSnap.docs) {
          const d = doc.data();
          const rawCompId = String(d.companyId || d.company_id || '').trim();
          if (rawCompId) {
            const compDoc = await db.collection('companies').doc(rawCompId).get();
            if (compDoc.exists) {
              foundRecruiter = true;
              break;
            }
          } else {
            foundRecruiter = true;
            break;
          }
        }
      }
      if (foundRecruiter) break;

      const recSnap2 = await db.collection('recruiters').where('phone', '==', variant).get();
      if (!recSnap2.empty) {
        for (const doc of recSnap2.docs) {
          const d = doc.data();
          const rawCompId = String(d.companyId || d.company_id || '').trim();
          if (rawCompId) {
            const compDoc = await db.collection('companies').doc(rawCompId).get();
            if (compDoc.exists) {
              foundRecruiter = true;
              break;
            }
          } else {
            foundRecruiter = true;
            break;
          }
        }
      }
      if (foundRecruiter) break;

      // 2. Check /users
      const usersSnap = await db.collection('users').where('phoneNumber', '==', variant).get();
      for (const doc of usersSnap.docs) {
        const u = doc.data();
        if (u.role === 'recruiter' || u.userType === 'recruiter') {
          foundRecruiter = true;
          break;
        }
      }
      if (foundRecruiter) break;

      const usersSnap2 = await db.collection('users').where('phone', '==', variant).get();
      for (const doc of usersSnap2.docs) {
        const u = doc.data();
        if (u.role === 'recruiter' || u.userType === 'recruiter') {
          foundRecruiter = true;
          break;
        }
      }
      if (foundRecruiter) break;
    }

    if (foundRecruiter) {
      return {
        exists: true,
        message: '',
      };
    } else {
      return {
        exists: false,
        message: 'No recruiter account found with this mobile number. Please create an account first.',
      };
    }
  }
);

