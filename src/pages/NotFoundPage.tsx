import React from 'react';
import { NavLink } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import { ROUTES } from '@/utils/constants';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 mb-4 shadow-sm">
        <FileQuestion className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">404 - Page Not Found</h1>
      <p className="text-sm text-slate-500 max-w-md mb-6">
        The page you are looking for does not exist or has been moved within the TalentBay Recruiter portal.
      </p>
      <NavLink
        to={ROUTES.DASHBOARD}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 transition shadow-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Return to Dashboard
      </NavLink>
    </div>
  );
};
