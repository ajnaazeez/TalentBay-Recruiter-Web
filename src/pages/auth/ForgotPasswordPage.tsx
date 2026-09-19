import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Mail, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { ROUTES } from '@/utils/constants';
import { useAuth } from '@/hooks/useAuth';
import { formatAuthErrorMessage } from '@/utils/errors';
import { isValidEmail } from '@/utils/validators';

export const ForgotPasswordPage: React.FC = () => {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your work email address.');
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    try {
      setError(null);
      setLoading(true);
      await sendPasswordReset(cleanEmail);
      setIsSent(true);
    } catch (err: unknown) {
      console.error('Password reset error:', err);
      setError(formatAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Reset Password
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1.5">
          Enter your registered work email to receive password reset instructions
        </p>
      </div>

      {isSent ? (
        <div className="p-6 bg-cyan-950/40 border border-cyan-800/60 rounded-2xl text-center space-y-3.5">
          <div className="w-12 h-12 bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 rounded-full flex items-center justify-center mx-auto shadow-sm shadow-cyan-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-white">Reset Email Sent</h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            We have sent password reset instructions to <strong className="text-cyan-300">{email}</strong>. Please check your inbox and follow the link.
          </p>
          <div className="pt-2">
            <NavLink
              to={ROUTES.LOGIN}
              className="inline-flex items-center justify-center px-4 py-2 text-xs font-bold text-slate-200 hover:text-white bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/80 rounded-xl transition duration-150"
            >
              Return to Login
            </NavLink>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3.5 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Work Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="recruiter@company.com"
                className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-900/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition duration-150"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500 hover:from-cyan-300 hover:via-teal-300 hover:to-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
          >
            <span>{loading ? 'Sending link...' : 'Send Reset Link'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      <div className="text-center pt-3 border-t border-slate-800/80">
        <NavLink
          to={ROUTES.LOGIN}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-cyan-300 transition duration-150"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Login
        </NavLink>
      </div>
    </div>
  );
};
