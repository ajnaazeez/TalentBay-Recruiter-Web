import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Building2,
  Mail,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  LogIn,
} from 'lucide-react';
import { ROUTES } from '@/utils/constants';
import { useAuth } from '@/hooks/useAuth';
import { formatAuthErrorMessage } from '@/utils/errors';
import { normalizePhoneNumber } from '@/utils/phone';
import { isValidEmail } from '@/utils/validators';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  // Unified Registration Form Fields
  const [displayName, setDisplayName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [designation, setDesignation] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCandidateError = Boolean(
    error && (
      error.toLowerCase().includes('candidate') ||
      error.toLowerCase().includes('job seeker')
    )
  );

  const isExistingAccountError = Boolean(
    error && !isCandidateError && (
      error.toLowerCase().includes('already exists') ||
      error.toLowerCase().includes('already associated') ||
      error.toLowerCase().includes('already in use') ||
      error.toLowerCase().includes('already registered')
    )
  );

  // Handle Unified Recruiter Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phoneNumber.trim();

    if (
      !displayName.trim() ||
      !companyName.trim() ||
      !cleanEmail ||
      !cleanPhone ||
      !password.trim()
    ) {
      setError('Please fill in all required fields.');
      return;
    }

    // Strict Email validation
    if (!isValidEmail(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    // Phone normalization and validation
    const fullPhoneNumber = normalizePhoneNumber(phoneNumber.trim(), countryCode);
    const digitsOnly = fullPhoneNumber.replace(/\D/g, '');
    if (!digitsOnly || digitsOnly.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    // Password strength requirement
    if (password.length < 6) {
      setError('Your password is too weak. Please use a stronger password (at least 6 characters).');
      return;
    }

    try {
      setError(null);
      setLoading(true);

      await signUp({
        displayName: displayName.trim(),
        companyName: companyName.trim(),
        email: email.trim(),
        phoneNumber: fullPhoneNumber,
        designation: designation.trim(),
        password,
      });

      navigate(ROUTES.DASHBOARD);
    } catch (err: unknown) {
      console.error('Registration error:', err);
      const friendlyMessage = formatAuthErrorMessage(err);
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Create Recruiter Account
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1.5">
          Post jobs, connect with candidates, and hire top talent in minutes
        </p>
      </div>

      {/* Visible, Prominent Error Banner */}
      {error && (
        <div 
          id="registration-error-banner"
          role="alert"
          aria-live="assertive"
          className="p-4 bg-red-950/90 border-2 border-red-500/70 rounded-2xl text-xs text-red-200 space-y-3 shadow-2xl shadow-red-950/60 animate-in fade-in duration-200"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
            <div className="flex-1">
              <p className="font-bold text-sm text-red-100 leading-snug">{error}</p>
            </div>
          </div>
          {isExistingAccountError && (
            <div className="pt-2.5 border-t border-red-800/80 flex items-center justify-between">
              <span className="text-xs text-red-300 font-medium">Already have an account?</span>
              <NavLink
                to={ROUTES.LOGIN}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/40 rounded-xl font-bold text-cyan-300 hover:text-cyan-200 text-xs transition duration-150"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </NavLink>
            </div>
          )}
        </div>
      )}

      {/* Unified Registration Form */}
      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Full Name <span className="text-cyan-400">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <User className="w-4 h-4" />
            </div>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Sarah Jenkins"
              className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-900/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition duration-150"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Company Name <span className="text-cyan-400">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Building2 className="w-4 h-4" />
            </div>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Acme Technologies"
              className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-900/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition duration-150"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Work Email Address <span className="text-cyan-400">*</span>
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
                placeholder="sarah@acme.com"
                className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-900/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition duration-150"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Phone Number <span className="text-cyan-400">*</span>
            </label>
            <div className="flex gap-2">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-[82px] px-2 py-2.5 text-xs font-bold bg-slate-900/80 border border-slate-700/80 rounded-xl text-white focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 shrink-0 cursor-pointer"
                aria-label="Country Code"
              >
                <option value="+91" className="bg-slate-900 text-white">🇮🇳 +91</option>
                <option value="+1" className="bg-slate-900 text-white">🇺🇸 +1</option>
                <option value="+44" className="bg-slate-900 text-white">🇬🇧 +44</option>
                <option value="+65" className="bg-slate-900 text-white">🇸🇬 +65</option>
                <option value="+971" className="bg-slate-900 text-white">🇦🇪 +971</option>
              </select>
              <input
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="9876543210"
                maxLength={15}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-900/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition duration-150 font-medium"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Role / Designation <span className="text-slate-500 font-normal text-[11px]">(Optional)</span>
          </label>
          <input
            type="text"
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            placeholder="e.g. Recruitment Lead"
            className="w-full px-3.5 py-2.5 text-sm bg-slate-900/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition duration-150"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Password <span className="text-cyan-400">*</span>
          </label>
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
          <span>{loading ? 'Setting up workspace...' : 'Create Recruiter Account'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="text-center pt-3 border-t border-slate-800/80">
        <p className="text-xs text-slate-400">
          Already registered?{' '}
          <NavLink
            to={ROUTES.LOGIN}
            className="font-bold text-cyan-400 hover:text-cyan-300 hover:underline transition duration-150"
          >
            Sign in
          </NavLink>
        </p>
      </div>
    </div>
  );
};
