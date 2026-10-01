import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Phone, ArrowRight, AlertCircle, KeyRound, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { ConfirmationResult, RecaptchaVerifier } from 'firebase/auth';
import { ROUTES } from '@/utils/constants';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/authService';
import { functionsService } from '@/services/functionsService';
import { formatAuthErrorMessage } from '@/utils/errors';
import { normalizePhoneNumber } from '@/utils/phone';
import { isValidEmail, isValidPhone } from '@/utils/validators';

type LoginMethod = 'email' | 'phone';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signInWithPhoneOtp } = useAuth();
  const rawFrom = (location.state as { from?: { pathname?: string } })?.from?.pathname;
  const from =
    rawFrom &&
    rawFrom !== ROUTES.LOGIN &&
    rawFrom !== ROUTES.REGISTER &&
    rawFrom !== ROUTES.FORGOT_PASSWORD
      ? rawFrom
      : ROUTES.DASHBOARD;

  const [loginMethod, setLoginMethod] = useState<LoginMethod>('email');

  // Email state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Phone state
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [codeSent, setCodeSent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
          recaptchaVerifierRef.current = null;
        } catch {
          // ignore cleanup error
        }
      }
    };
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password.trim()) {
      setError('Please enter both work email and password.');
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    try {
      setError(null);
      setLoading(true);
      await signIn(cleanEmail, password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      console.error('Email Login error:', err);
      setError(formatAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSendPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullPhoneNumber = normalizePhoneNumber(phoneNumber.trim(), countryCode);
    if (!fullPhoneNumber || !isValidPhone(fullPhoneNumber)) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    try {
      setError(null);
      setLoading(true);

      // Authoritative pre-check: verify active recruiter account exists before sending OTP
      let exists = false;
      try {
        const checkResult = await functionsService.checkRecruiterPhoneForSignIn(fullPhoneNumber);
        if (checkResult && checkResult.exists) {
          exists = true;
        }
      } catch {
        // ignore notice, proceed to fallback check
      }

      if (!exists) {
        // Fallback to client-side Firestore lookup across phone variants
        const matchedRec = await authService.findRecruiterByPhone(fullPhoneNumber);
        if (matchedRec) {
          exists = true;
        }
      }

      if (!exists) {
        setError('Please create an account first.');
        setLoading(false);
        return;
      }

      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {
          // ignore
        }
        recaptchaVerifierRef.current = null;
      }

      recaptchaVerifierRef.current = authService.setUpRecaptcha('recaptcha-login-container');

      const confirmation = await authService.sendPhoneOtp(
        fullPhoneNumber,
        recaptchaVerifierRef.current
      );

      setConfirmationResult(confirmation);
      setCodeSent(true);
    } catch (err: unknown) {
      console.error('Send Phone OTP error:', err);
      setError(formatAuthErrorMessage(err));
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
          recaptchaVerifierRef.current = null;
        } catch {
          // ignore
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) {
      setError('Session expired. Please request a new OTP.');
      return;
    }

    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    try {
      setError(null);
      setLoading(true);

      // Authenticate through AuthProvider to guarantee session, user state, and profile are ready before route transition
      await signInWithPhoneOtp(confirmationResult, cleanOtp);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      console.error('Verify OTP error:', err);
      setError(formatAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const isNoAccountError = Boolean(
    error && (
      error.toLowerCase().includes('create an account first') ||
      error.toLowerCase().includes('no recruiter account found') ||
      error.toLowerCase().includes('no recruiter profile found') ||
      error.toLowerCase().includes('sign up to create')
    )
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Recruiter Sign In
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1.5">
          Access your verified hiring workspace and candidate talent pool
        </p>
      </div>

      {/* Login Method Toggle */}
      <div className="grid grid-cols-2 p-1.5 bg-slate-900/90 rounded-2xl border border-slate-800/80 gap-1.5">
        <button
          type="button"
          onClick={() => {
            setLoginMethod('email');
            setError(null);
          }}
          className={`flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition duration-150 ${
            loginMethod === 'email'
              ? 'bg-slate-800 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Mail className="w-3.5 h-3.5 text-current" />
          Email & Password
        </button>
        <button
          type="button"
          onClick={() => {
            setLoginMethod('phone');
            setError(null);
          }}
          className={`flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition duration-150 ${
            loginMethod === 'phone'
              ? 'bg-slate-800 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Phone className="w-3.5 h-3.5 text-current" />
          Mobile Number
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-950/80 border-2 border-red-500/60 rounded-2xl text-xs text-red-200 space-y-3 shadow-xl shadow-red-950/40 animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
            <div className="flex-1">
              <p className="font-bold text-sm text-red-100 leading-snug">{error}</p>
            </div>
          </div>
          {isNoAccountError && (
            <div className="pt-2.5 border-t border-red-800/80 flex items-center justify-between">
              <span className="text-xs text-red-300 font-medium">Don't have a recruiter account yet?</span>
              <NavLink
                to={ROUTES.REGISTER}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/50 rounded-xl font-bold text-cyan-300 hover:text-cyan-200 text-xs transition duration-150 shadow-sm shadow-cyan-500/20"
              >
                Create Account
                <ArrowRight className="w-3.5 h-3.5" />
              </NavLink>
            </div>
          )}
        </div>
      )}

      {/* 1. Email Login Form */}
      {loginMethod === 'email' && (
        <form onSubmit={handleEmailLogin} className="space-y-4">
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

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Password
              </label>
              <NavLink
                to={ROUTES.FORGOT_PASSWORD}
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition duration-150"
              >
                Forgot password?
              </NavLink>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-900/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition duration-150"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500 hover:from-cyan-300 hover:via-teal-300 hover:to-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
          >
            <span>{loading ? 'Signing in...' : 'Sign In with Email'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* 2. Phone Login Form */}
      {loginMethod === 'phone' && (
        <div>
          {!codeSent ? (
            <form onSubmit={handleSendPhoneOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Mobile Number
                </label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-24 px-2.5 py-2.5 text-xs font-bold bg-slate-900/80 border border-slate-700/80 rounded-xl text-white focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                  >
                    <option value="+91" className="bg-slate-900 text-white">🇮🇳 +91</option>
                    <option value="+1" className="bg-slate-900 text-white">🇺🇸 +1</option>
                    <option value="+44" className="bg-slate-900 text-white">🇬🇧 +44</option>
                    <option value="+65" className="bg-slate-900 text-white">🇸🇬 +65</option>
                    <option value="+971" className="bg-slate-900 text-white">🇦🇪 +971</option>
                  </select>
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="9876543210"
                      maxLength={15}
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-900/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 font-medium transition duration-150"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  We will send a 6-digit SMS verification code to this phone number
                </p>
              </div>

              {/* Invisible Recaptcha Container */}
              <div id="recaptcha-login-container"></div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500 hover:from-cyan-300 hover:via-teal-300 hover:to-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
              >
                <span>{loading ? 'Sending Code...' : 'Send Verification OTP'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyPhoneOtp} className="space-y-4">
              <div className="p-3.5 bg-cyan-950/40 border border-cyan-800/60 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-cyan-200">
                    Code sent to {countryCode} {phoneNumber}
                  </p>
                  <p className="text-[11px] text-cyan-400/80">Enter the 6-digit code received</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCodeSent(false);
                    setOtp('');
                    setError(null);
                  }}
                  className="text-xs font-bold text-cyan-300 hover:text-cyan-100 flex items-center gap-1 underline transition duration-150"
                >
                  <RotateCcw className="w-3 h-3" />
                  Change
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  6-Digit SMS Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    maxLength={6}
                    autoFocus
                    className="w-full pl-10 pr-3.5 py-2.5 text-base font-bold tracking-widest bg-slate-900/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 text-center"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500 hover:from-cyan-300 hover:via-teal-300 hover:to-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
              >
                <span>{loading ? 'Verifying...' : 'Verify & Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      )}

      <div className="text-center pt-3 border-t border-slate-800/80">
        <p className="text-xs text-slate-400">
          New hiring manager or recruiter?{' '}
          <NavLink
            to={ROUTES.REGISTER}
            className="font-bold text-cyan-400 hover:text-cyan-300 hover:underline transition duration-150"
          >
            Create an account
          </NavLink>
        </p>
      </div>
    </div>
  );
};
