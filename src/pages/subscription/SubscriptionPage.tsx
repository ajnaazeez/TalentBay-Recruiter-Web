import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Sparkles,
  Calendar,
  AlertCircle,
  ShieldCheck,
  CreditCard,
  ArrowRight,
  Plus,
  LayoutDashboard,
} from 'lucide-react';
import { Button } from '@/components/common/Button';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionHeader } from '@/components/common/SectionHeader';
import { useAuth } from '@/hooks/useAuth';
import { SUBSCRIPTION_PLANS, ROUTES } from '@/utils/constants';
import { formatDate } from '@/utils/formatters';
import { subscriptionService } from '@/services/subscriptionService';

export const SubscriptionPage: React.FC = () => {
  const { recruiterProfile, refreshProfile, isSubscribed } = useAuth();
  const navigate = useNavigate();
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);

  // Reconciliation / Manual Verification State
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyPaymentRef, setVerifyPaymentRef] = useState('');
  const [verifyPlanId, setVerifyPlanId] = useState('trial_60_days_1_rupee');
  const [isVerifying, setIsVerifying] = useState(false);

  const currentPlanId = recruiterProfile?.subscriptionPlanId || recruiterProfile?.subscriptionTier;
  const isTrialEligible = subscriptionService.isTrialEligible(recruiterProfile);

  const currentPlanObj = SUBSCRIPTION_PLANS.find((p) => p.id === currentPlanId);

  const expiryDateFormatted = recruiterProfile?.subscriptionExpiry
    ? formatDate(recruiterProfile.subscriptionExpiry)
    : null;

  // Real-time synchronization when AuthProvider detects subscription activation during active checkout
  const wasSubscribedRef = React.useRef(isSubscribed);
  React.useEffect(() => {
    if (isSubscribed && !wasSubscribedRef.current) {
      subscriptionService.dismissActiveCheckout();
      setProcessingPlanId(null);
      setPaymentError(null);
    }
    wasSubscribedRef.current = isSubscribed;
  }, [isSubscribed]);

  // Clean up any stray checkout elements if component unmounts
  React.useEffect(() => {
    return () => {
      subscriptionService.dismissActiveCheckout();
    };
  }, []);

  const handleSubscribe = async (planId: string) => {
    if (!recruiterProfile) return;

    try {
      setPaymentError(null);
      setPaymentSuccess(null);
      setProcessingPlanId(planId);
      setVerifyPlanId(planId);

      await subscriptionService.initiatePayment(
        planId,
        recruiterProfile,
        async () => {
          setProcessingPlanId(null);
          setPaymentSuccess('Subscription activated successfully!');
          await refreshProfile();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        (errorMsg) => {
          setProcessingPlanId(null);
          setPaymentError(errorMsg);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      );
    } catch (err: unknown) {
      setProcessingPlanId(null);
      setPaymentError(err instanceof Error ? err.message : 'Payment initiation failed.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recruiterProfile || !verifyPaymentRef.trim()) return;

    try {
      setIsVerifying(true);
      setPaymentError(null);

      await subscriptionService.verifyAndActivateManualPayment(
        recruiterProfile.uid,
        verifyPlanId,
        verifyPaymentRef.trim()
      );

      setShowVerifyModal(false);
      setVerifyPaymentRef('');
      setPaymentSuccess('Payment verified and subscription activated successfully!');
      await refreshProfile();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: unknown) {
      console.error('[SubscriptionPage] Error in handleVerifySubmit:', err);
      const rawMsg = err instanceof Error ? err.message : '';
      if (rawMsg.toLowerCase().includes('permission') || rawMsg.toLowerCase().includes('insufficient')) {
        setPaymentError('Payment verification could not be completed. Please verify your reference and try again.');
      } else {
        setPaymentError(rawMsg || 'Verification failed. Please try again.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-8 sm:space-y-10 max-w-6xl mx-auto pb-16">
      {/* 1. Page Header */}
      <PageHeader
        title="Subscription & Hiring Plans"
        description="Choose a verified recruiter subscription plan to unlock job posting, candidate connect, and direct messaging"
        badge={
          isSubscribed ? (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Active Subscription
            </span>
          ) : (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Subscription Inactive
            </span>
          )
        }
      />

      {/* 2. Success Banner with Immediate Feedback & Quick Actions */}
      {paymentSuccess && (
        <div className="p-6 sm:p-7 bg-gradient-to-r from-emerald-50 via-teal-50/70 to-emerald-50 border border-emerald-200 rounded-3xl text-emerald-900 shadow-sm space-y-4 animate-in fade-in duration-300">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-emerald-950">
                Subscription Activated Successfully!
              </h3>
              <p className="text-xs sm:text-sm text-emerald-800 leading-relaxed">
                Your recruiter workspace is now active with the{' '}
                <strong>{currentPlanObj?.name || 'Recruiter'}</strong> plan. All recruitment features,
                active job postings, candidate matching, and direct messaging are unlocked.
              </p>
              {expiryDateFormatted && (
                <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5 pt-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  Valid through {expiryDateFormatted}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-emerald-200/60">
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate(ROUTES.DASHBOARD)}
              leftIcon={<LayoutDashboard className="w-3.5 h-3.5" />}
            >
              Go to Dashboard
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(ROUTES.JOB_CREATE)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Post a Job
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(ROUTES.CANDIDATES)}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Candidate Connect
            </Button>
          </div>
        </div>
      )}

      {/* 3. Error Alert & Instant Payment Verification Recovery */}
      {paymentError && (
        <div className="p-5 bg-red-50/90 border border-red-200 rounded-3xl text-xs sm:text-sm text-red-800 space-y-3 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <p className="font-bold text-red-950">{paymentError}</p>
              <p className="text-xs text-red-700">
                If your payment was completed on Google Pay or UPI, you can verify your transaction reference below to activate your subscription immediately.
              </p>
            </div>
          </div>
          <div className="pt-2 border-t border-red-200/60 flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-semibold text-red-900">
              Completed payment via Google Pay / UPI?
            </span>
            <button
              type="button"
              onClick={() => setShowVerifyModal(true)}
              className="px-3.5 py-1.5 text-xs font-bold text-teal-800 bg-teal-100 hover:bg-teal-200 border border-teal-300 rounded-xl transition shadow-xs flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
              Verify Payment Reference
            </button>
          </div>
        </div>
      )}

      {/* Manual Verification Modal / Card */}
      {showVerifyModal && (
        <div className="p-6 bg-slate-900 text-white rounded-3xl border border-teal-500/30 shadow-2xl space-y-4 animate-in fade-in duration-200">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                Verify & Activate Your Payment
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Enter your Razorpay Payment ID (e.g. <code className="text-teal-300 bg-slate-800 px-1 py-0.5 rounded">pay_...</code>) from your payment receipt SMS/email to verify and activate your subscription.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowVerifyModal(false)}
              className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 bg-slate-800 rounded-lg"
            >
              Close
            </button>
          </div>

          <form onSubmit={handleVerifySubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Plan
                </label>
                <select
                  value={verifyPlanId}
                  onChange={(e) => setVerifyPlanId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-400"
                >
                  {SUBSCRIPTION_PLANS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.displayPrice})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Razorpay Payment ID <span className="text-teal-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. pay_TcjSWMiPbBTWgHt"
                  value={verifyPaymentRef}
                  onChange={(e) => setVerifyPaymentRef(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowVerifyModal(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isVerifying || !verifyPaymentRef.trim()}
                className="px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-teal-400 to-cyan-400 hover:from-teal-300 hover:to-cyan-300 rounded-xl transition shadow-sm shadow-teal-500/30 disabled:opacity-50"
              >
                {isVerifying ? 'Verifying...' : 'Verify & Activate'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. Current Subscription Overview Card */}
      {isSubscribed && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Current Active Plan
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900">
              {currentPlanObj?.name || 'Custom Verified Plan'}
            </h3>
            {expiryDateFormatted && (
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Valid through <strong>{expiryDateFormatted}</strong>
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3.5 py-2.5 rounded-2xl border border-slate-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Full Workspace Gating Unlocked</span>
            </div>
          </div>
        </div>
      )}

      {/* 5. Verified Subscription Plans Grid */}
      <div className="space-y-4">
        <SectionHeader
          title="Verified Recruiter Subscription Plans"
          description="Select a subscription tier to power your candidate sourcing and active hiring"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const isCurrent = isSubscribed && plan.id === currentPlanId;
            const isTrial = plan.id === 'trial_60_days_1_rupee';
            const isTrialDisabled = isTrial && !isTrialEligible && !isCurrent;

            return (
              <div
                key={plan.id}
                className={`p-6 rounded-3xl border flex flex-col justify-between transition relative ${
                  isCurrent
                    ? 'bg-teal-50/20 border-teal-500 shadow-md ring-1 ring-teal-500'
                    : isTrialDisabled
                    ? 'bg-slate-50/70 border-slate-200 opacity-60'
                    : 'bg-white border-slate-200/90 shadow-card hover:border-slate-300'
                }`}
              >
                {isCurrent && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-teal-600 text-white font-bold text-[10px] rounded-full uppercase tracking-wider shadow-xs">
                    Current Plan
                  </span>
                )}

                {isTrial && isTrialEligible && !isCurrent && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-amber-500 text-white font-bold text-[10px] rounded-full uppercase tracking-wider shadow-xs flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> Introductory Offer
                  </span>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{plan.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 min-h-[32px]">
                      {plan.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-slate-900">
                        {plan.displayPrice}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {plan.period}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Included Features
                    </span>
                    <ul className="space-y-2 text-xs text-slate-700">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="leading-tight">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-6 mt-4 border-t border-slate-100">
                  <Button
                    variant={isCurrent ? 'secondary' : 'primary'}
                    size="md"
                    className="w-full"
                    disabled={isCurrent || isTrialDisabled || processingPlanId === plan.id}
                    onClick={() => handleSubscribe(plan.id)}
                    leftIcon={<CreditCard className="w-4 h-4" />}
                  >
                    {isCurrent
                      ? 'Current Active Plan'
                      : isTrialDisabled
                      ? 'Introductory Trial Used'
                      : processingPlanId === plan.id
                      ? 'Opening Gateway...'
                      : `Subscribe for ${plan.displayPrice}`}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
