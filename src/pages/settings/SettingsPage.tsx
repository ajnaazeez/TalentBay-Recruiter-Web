import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sun,
  Moon,
  Smartphone,
  CreditCard,
  HelpCircle,
  Info,
  LogOut,
  AlertTriangle,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Trash2,
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { subscriptionService } from '@/services/subscriptionService';
import { ROUTES } from '@/utils/constants';
import { formatDate } from '@/utils/formatters';

export const SettingsPage: React.FC = () => {
  const { user, recruiterProfile, signOut, deleteAccount, isSubscribed, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const [cancellingSubscription, setCancellingSubscription] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const handleSignOut = async () => {
    await signOut();
    navigate(ROUTES.LOGIN);
  };

  const handleCancelSubscription = async () => {
    if (!user?.uid) return;
    try {
      setCancellingSubscription(true);
      await subscriptionService.cancelSubscription(user.uid);
      await refreshProfile();
      setShowCancelModal(false);
      setFeedbackMessage('Subscription cancellation requested. Plan remains active until expiry.');
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: unknown) {
      console.error('Failed to cancel subscription:', err);
    } finally {
      setCancellingSubscription(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.toUpperCase() !== 'DELETE') return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      await deleteAccount();
      navigate(ROUTES.LOGIN, { replace: true });
    } catch (err: unknown) {
      console.error('Failed to delete account:', err);
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete account. Please try again.');
      setIsDeleting(false);
    }
  };

  const isCancelled = recruiterProfile?.isSubscriptionCancelled === true;
  const expiryDate = recruiterProfile?.subscriptionExpiry
    ? formatDate(recruiterProfile.subscriptionExpiry)
    : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Settings & Preferences
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Configure appearance, manage workspace subscription, access help documentation, and manage your session.
        </p>
      </div>

      {feedbackMessage && (
        <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal-600" />
          {feedbackMessage}
        </div>
      )}

      {/* Section 1: Appearance (Matching Flutter) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Appearance & Theme
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: 'light' as const, label: 'Light Theme', icon: Sun, desc: 'Clean high-contrast theme' },
            { id: 'dark' as const, label: 'Dark Theme', icon: Moon, desc: 'Sleek dark interface' },
            { id: 'system' as const, label: 'System Default', icon: Smartphone, desc: 'Follow OS preference' },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = theme === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTheme(item.id)}
                className={`p-4 rounded-xl border text-left transition flex items-start gap-3 ${

                  isSelected
                    ? 'bg-teal-50/50 border-teal-500 shadow-xs ring-1 ring-teal-500'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{item.label}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 2: Subscription Management (Matching Flutter) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-teal-600" />
            Subscription & Workspace Access
          </h2>
          <button
            onClick={() => navigate(ROUTES.SUBSCRIPTION)}
            className="text-xs font-bold text-teal-700 hover:underline inline-flex items-center gap-1"
          >
            View Plans &rarr;
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                {isSubscribed ? 'Premium Recruiter Tier' : 'Subscription Required'}
              </h3>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                  isSubscribed
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {isSubscribed ? (isCancelled ? 'Cancelled (Active until expiry)' : 'Active') : 'Inactive'}
              </span>
            </div>
            {expiryDate && (
              <p className="text-xs text-slate-500">
                Current cycle valid through: <strong className="text-slate-800">{expiryDate}</strong>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isSubscribed && !isCancelled && (
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="px-3.5 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition"
              >
                Cancel Auto-Renew
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate(ROUTES.SUBSCRIPTION)}
              className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-black rounded-xl transition shadow-xs"
            >
              {isSubscribed ? 'Change Plan' : 'Subscribe Now'}
            </button>
          </div>
        </div>
      </div>

      {/* Section 3: Support, About & Documentation (Matching Flutter) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs divide-y divide-slate-100 overflow-hidden">
        <button
          onClick={() => navigate(ROUTES.SUPPORT)}
          className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition text-left"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-800">Support & Help Desk</p>
              <p className="text-xs text-slate-500">Contact our support team, report issues, and view hiring FAQs</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        <button
          onClick={() => navigate(ROUTES.ABOUT)}
          className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition text-left"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-800">About TalentBay Recruiter</p>
              <p className="text-xs text-slate-500">Version 1.0.18, platform features, Waqtix LLP legal info</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Section 4: Danger Zone & Session Sign Out */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sign Out Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Account Session
            </h4>
            <p className="text-xs text-slate-500">
              Securely sign out of your recruiter workspace on this device.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Delete Account Card */}
        <div className="bg-rose-50/50 rounded-2xl p-6 border border-rose-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Delete Account
            </h4>
            <p className="text-xs text-rose-700">
              Permanently purge account records via Cloud Function.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-rose-700 bg-rose-100 hover:bg-rose-200 rounded-xl transition border border-rose-300"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Recruiter Account</span>
          </button>
        </div>
      </div>

      {/* Cancel Subscription Modal matching Flutter */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <XCircle className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">Cancel Subscription?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to cancel your subscription auto-renewal? You will retain premium hiring workspace access until your current billing period ends on <strong>{expiryDate || 'expiry'}</strong>.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-xl"
              >
                Keep Active
              </button>
              <button
                type="button"
                disabled={cancellingSubscription}
                onClick={handleCancelSubscription}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition disabled:opacity-50"
              >
                {cancellingSubscription ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">Confirm Account Deletion</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              This action triggers the backend deletion Cloud Function and cannot be undone. Type <strong className="text-rose-700">DELETE</strong> to confirm:
            </p>
            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2">
                <XCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{deleteError}</span>
              </div>
            )}
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-rose-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText.toUpperCase() !== 'DELETE' || isDeleting}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
