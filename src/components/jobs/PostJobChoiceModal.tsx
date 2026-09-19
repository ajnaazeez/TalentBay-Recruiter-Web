import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  FileSpreadsheet,
  ArrowRight,
  X,
  Sparkles,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { ROUTES } from '@/utils/constants';

interface PostJobChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PostJobChoiceModal: React.FC<PostJobChoiceModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectNormal = () => {
    onClose();
    navigate(ROUTES.JOB_CREATE);
  };

  const handleSelectBulk = () => {
    onClose();
    navigate(ROUTES.JOB_BULK_UPLOAD);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200/90 z-10 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200/60">
                TalentBay Hiring
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Post a Job Opening
            </h3>
            <p className="text-xs sm:text-sm text-slate-500">
              Choose how you want to create and publish your job openings on the platform
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Two Clear Choices */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Choice 1: Normal Job Posting */}
          <button
            type="button"
            onClick={handleSelectNormal}
            className="group relative p-5 rounded-2xl border border-slate-200 bg-white hover:border-teal-500 hover:shadow-lg hover:ring-1 hover:ring-teal-500/30 transition-all duration-200 text-left flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200/60 flex items-center justify-center text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors duration-200 shadow-xs">
                <FileText className="w-6 h-6" />
              </div>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-base font-bold text-slate-900 group-hover:text-teal-700 transition">
                    Normal Job Posting
                  </h4>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> AI Assisted
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Create a single job opening step-by-step with automated AI job description generator and customizable candidate requirements.
                </p>
              </div>

              <ul className="space-y-1.5 text-[11px] text-slate-600 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>Interactive step-by-step form</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>AI JD & requirements generator</span>
                </li>
              </ul>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-teal-700 group-hover:translate-x-0.5 transition-transform">
              <span>Create Single Job</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>

          {/* Choice 2: Bulk Job Upload */}
          <button
            type="button"
            onClick={handleSelectBulk}
            className="group relative p-5 rounded-2xl border border-slate-200 bg-white hover:border-cyan-500 hover:shadow-lg hover:ring-1 hover:ring-cyan-500/30 transition-all duration-200 text-left flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-200/60 flex items-center justify-center text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white transition-colors duration-200 shadow-xs">
                <FileSpreadsheet className="w-6 h-6" />
              </div>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-base font-bold text-slate-900 group-hover:text-cyan-700 transition">
                    Bulk Job Upload
                  </h4>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200 flex items-center gap-1">
                    <Zap className="w-2.5 h-2.5" /> Fast
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Upload multiple job postings at once using an Excel spreadsheet (.xlsx). Preview, validate, and publish jobs simultaneously.
                </p>
              </div>

              <ul className="space-y-1.5 text-[11px] text-slate-600 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                  <span>Downloadable verified template</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                  <span>Multi-role validation & batch publishing</span>
                </li>
              </ul>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-cyan-700 group-hover:translate-x-0.5 transition-transform">
              <span>Open Bulk Upload</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
