import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  Search,
  Bell,
  Plus,
  LogOut,
  User,
  Building2,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { ROUTES } from '@/utils/constants';
import { PostJobChoiceModal } from '@/components/jobs/PostJobChoiceModal';

interface HeaderProps {
  onOpenSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSidebar }) => {
  const { user, recruiterProfile, signOut } = useAuth();
  const { unreadCount } = useNotifications();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [postModalOpen, setPostModalOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate(ROUTES.LOGIN);
  };

  // Derive current section name from path
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith(ROUTES.JOB_BULK_UPLOAD) || path.startsWith('/bulk-upload')) return 'Bulk Job Upload';
    if (path.startsWith(ROUTES.JOB_CREATE)) return 'Post a New Job';
    if (path.startsWith(ROUTES.CLOSED_JOBS)) return 'Closed Positions';
    if (path.startsWith(ROUTES.JOBS)) return 'Jobs & Positions';
    if (path.startsWith(ROUTES.CANDIDATES)) return 'Candidate Connect';
    if (path.startsWith(ROUTES.APPLICATIONS)) return 'Job Applications';
    if (path.startsWith(ROUTES.CHAT)) return 'Messages & Chat';
    if (path.startsWith(ROUTES.NOTIFICATIONS)) return 'Notifications';
    if (path.startsWith(ROUTES.COMPANY_EDIT)) return 'Edit Company Profile';
    if (path.startsWith(ROUTES.COMPANY)) return 'Company Details';
    if (path.startsWith(ROUTES.PROFILE)) return 'Recruiter Profile';
    if (path.startsWith(ROUTES.SUBSCRIPTION)) return 'Subscription Plans';
    if (path.startsWith(ROUTES.SETTINGS)) return 'Settings';
    if (path.startsWith(ROUTES.SUPPORT)) return 'Support & Help';
    if (path.startsWith(ROUTES.ABOUT)) return 'About TalentBay';
    return 'Recruiter Overview';
  };

  const recruiterName = recruiterProfile?.fullName || recruiterProfile?.displayName || user?.email?.split('@')[0] || 'Recruiter';

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8 bg-white/95 backdrop-blur-xs border-b border-slate-200/90 shadow-xs">
        {/* Left side: Hamburger button (mobile) + Page Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSidebar}
            className="p-2 -ml-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg lg:hidden transition"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex flex-col">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
              {getPageTitle()}
            </h1>
            <span className="hidden md:inline text-[11px] text-slate-500 font-medium">
              TalentBay Recruiter Workspace
            </span>
          </div>
        </div>

        {/* Center: Search input */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search candidates, jobs, skills..."
              className="w-full pl-9 pr-4 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
            />
          </div>
        </div>

        {/* Right side: Quick actions & User menu */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Post Job Quick Action */}
          <button
            type="button"
            onClick={() => setPostModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 active:bg-teal-800 transition shadow-xs hover:shadow cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Post a Job</span>
            <span className="sm:hidden">Post</span>
          </button>

          {/* Notifications Icon Link with Live Badge */}
          <NavLink
            to={ROUTES.NOTIFICATIONS}
            className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            aria-label={`Notifications (${unreadCount} unread)`}
          >
            <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-teal-600 text-white text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-white shadow-xs">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </NavLink>

        {/* User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setProfileDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 p-1 text-slate-700 hover:bg-slate-100 rounded-xl transition"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-700 to-slate-800 flex items-center justify-center text-white text-xs font-bold ring-2 ring-teal-100 shrink-0">
              {recruiterName.charAt(0).toUpperCase()}
            </div>
            <div className="hidden xl:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-900 max-w-[120px] truncate leading-tight">
                {recruiterName}
              </span>
              <span className="text-[10px] text-slate-500 capitalize">
                {recruiterProfile?.designation || 'Hiring Lead'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
          </button>

          {/* Dropdown Menu */}
          {profileDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setProfileDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-dropdown border border-slate-200/90 py-1.5 z-40 text-sm animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="font-semibold text-slate-900 text-xs truncate">
                    {recruiterName}
                  </p>
                  <p className="text-slate-500 text-[11px] truncate mt-0.5">
                    {recruiterProfile?.officialEmail || user?.email || ''}
                  </p>
                  <div className="flex items-center gap-1 mt-1.5 text-[10px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md w-fit border border-teal-200/60">
                    <Sparkles className="w-2.5 h-2.5 text-teal-600" /> Active Workspace
                  </div>
                </div>

                <NavLink
                  to={ROUTES.PROFILE}
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 text-xs font-medium"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Recruiter Profile</span>
                </NavLink>

                <NavLink
                  to={ROUTES.COMPANY}
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 text-xs font-medium"
                >
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span>Company Details</span>
                </NavLink>

                <div className="border-t border-slate-100 my-1" />

                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    handleSignOut();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-rose-600 hover:bg-rose-50 text-xs transition font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>

    <PostJobChoiceModal
      isOpen={postModalOpen}
      onClose={() => setPostModalOpen(false)}
    />
  </>
);
};
