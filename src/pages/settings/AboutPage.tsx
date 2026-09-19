import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ShieldCheck,
  Zap,
  ChevronLeft,
  ExternalLink,
  Building2,
} from 'lucide-react';

import { APP_CONFIG } from '@/utils/constants';

export const AboutPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      </div>

      {/* Main Brand Card */}
      <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/90 shadow-xs text-center space-y-6 relative overflow-hidden">
        <div className="w-20 h-20 rounded-3xl bg-black flex items-center justify-center mx-auto shadow-md p-3">
          <img
            src="/recruiter.png"
            alt="TalentBay Recruiter"
            className="w-full h-full object-contain"
          />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            TALENTBAY RECRUITER
          </h1>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200/70 text-[11px] font-bold text-teal-800">
            <Sparkles className="w-3 h-3 text-teal-600" />
            Version {APP_CONFIG.version} (Web Edition)
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
          TalentBay is the premier platform connecting top-tier recruiters with exceptional talent.
          Our mission is to streamline the hiring process with verified skill matching, AI candidate scoring,
          and end-to-end encrypted messaging.
        </p>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200/60 flex items-center justify-center text-teal-600">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-xs font-bold text-slate-900">Candidate Connect</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Automated &ge;40% skill-based talent matching with real-time invitation tracking.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200/60 flex items-center justify-center text-teal-600">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-xs font-bold text-slate-900">AI Scoring Engine</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Intelligent job application fit scoring and candidate recommendation summaries.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200/60 flex items-center justify-center text-teal-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-xs font-bold text-slate-900">Encrypted Messaging</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            High-security AES-CTR + PKCS#7 encrypted communications between recruiters and candidates.
          </p>
        </div>
      </div>

      {/* Developer & Legal Footer */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6 text-center">
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Developed & Maintained by
          </p>
          <div className="flex items-center justify-center gap-2">
            <Building2 className="w-4 h-4 text-slate-700" />
            <span className="text-sm font-black text-slate-900">Waqtix LLP</span>
          </div>
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} TalentBay Inc. All rights reserved.
          </p>
        </div>

        <div className="border-t border-slate-100 pt-5 flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-600">
          <a
            href="https://www.waqtixllp.com/privacy-and-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-teal-600 transition inline-flex items-center gap-1"
          >
            Privacy Policy <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
          <span className="text-slate-300">•</span>
          <a
            href="https://www.waqtixllp.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-teal-600 transition inline-flex items-center gap-1"
          >
            Official Website <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
          <span className="text-slate-300">•</span>
          <a
            href="mailto:support@talentbay.com"
            className="hover:text-teal-600 transition inline-flex items-center gap-1"
          >
            Email Support <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        </div>
      </div>
    </div>
  );
};
