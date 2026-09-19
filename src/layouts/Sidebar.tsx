import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  Archive,
  Users,
  FileCheck,
  MessageSquare,
  Bell,
  Building2,
  CreditCard,
  Settings,
  UserCheck,
  HelpCircle,
  Info,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/utils/constants';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  unreadNotificationsCount?: number;
  unreadChatsCount?: number;
}

interface NavItem {
  title: string;
  to: string;
  icon: React.ElementType;
  badge?: string | number;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
  unreadNotificationsCount = 0,
  unreadChatsCount = 0,
}) => {
  const location = useLocation();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const navSections: NavSection[] = [
    {
      items: [
        { title: 'Dashboard', to: ROUTES.DASHBOARD, icon: LayoutDashboard },
      ],
    },
    {
      title: 'Recruitment',
      items: [
        { title: 'Jobs', to: ROUTES.JOBS, icon: Briefcase },
        { title: 'Closed Positions', to: ROUTES.CLOSED_JOBS, icon: Archive },
        { title: 'Candidate Connect', to: ROUTES.CANDIDATES, icon: Users },
        { title: 'Applications', to: ROUTES.APPLICATIONS, icon: FileCheck },
      ],
    },
    {
      title: 'Engagement',
      items: [
        {
          title: 'Messages',
          to: ROUTES.CHAT,
          icon: MessageSquare,
          badge: unreadChatsCount > 0 ? unreadChatsCount : undefined,
        },
        {
          title: 'Notifications',
          to: ROUTES.NOTIFICATIONS,
          icon: Bell,
          badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
        },
      ],
    },
    {
      title: 'Workspace',
      items: [
        { title: 'Company Details', to: ROUTES.COMPANY, icon: Building2 },
        { title: 'Profile', to: ROUTES.PROFILE, icon: UserCheck },
        { title: 'Subscription', to: ROUTES.SUBSCRIPTION, icon: CreditCard },
        { title: 'Settings', to: ROUTES.SETTINGS, icon: Settings },
      ],
    },
    {
      title: 'Support & Info',
      items: [
        { title: 'Support', to: ROUTES.SUPPORT, icon: HelpCircle },
        { title: 'About', to: ROUTES.ABOUT, icon: Info },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed top-0 left-0 bottom-0 z-50 flex flex-col bg-[#0b0f19] border-r border-[#1e293b] transition-all duration-300 ease-in-out lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          isCollapsed ? 'lg:w-[72px]' : 'lg:w-64 w-64'
        )}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-[#1e293b]/90 bg-[#070b12]">
          <NavLink
            to={ROUTES.DASHBOARD}
            className={cn(
              'flex items-center gap-3 group overflow-hidden',
              isCollapsed && 'justify-center w-full'
            )}
          >
            <img
              src="/recruiter.png"
              alt="TalentBay Recruiter"
              className="w-8 h-8 rounded-lg object-contain bg-black shrink-0 shadow-xs group-hover:scale-105 transition-transform"
            />
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-white text-sm tracking-tight flex items-center gap-1.5">
                  TalentBay
                  <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-400 border border-teal-500/30">
                    Recruiter
                  </span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Hiring Workspace</span>
              </div>
            )}
          </NavLink>

          {/* Close button on mobile */}
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation items list */}
        <div className="flex-1 overflow-y-auto px-2.5 py-4 space-y-5 scrollbar-thin scrollbar-thumb-slate-800">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {section.title && !isCollapsed && (
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  {section.title}
                </p>
              )}
              {isCollapsed && section.title && (
                <div className="w-6 h-px bg-slate-800 mx-auto my-2" />
              )}
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.to ||
                  (item.to !== ROUTES.DASHBOARD && location.pathname.startsWith(`${item.to}/`));

                return (
                  <div
                    key={item.to}
                    className="relative"
                    onMouseEnter={() => isCollapsed && setHoveredItem(item.to)}
                    onMouseLeave={() => isCollapsed && setHoveredItem(null)}
                  >
                    <NavLink
                      to={item.to}
                      onClick={() => onClose?.()}
                      className={({ isActive: matchActive }) =>
                        cn(
                          'flex items-center px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 group relative',
                          isCollapsed ? 'justify-center px-2' : 'justify-between',
                          matchActive || isActive
                            ? 'bg-teal-500/15 text-teal-300 font-semibold border border-teal-500/30 shadow-xs'
                            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                        )
                      }
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon
                          className={cn(
                            'w-4 h-4 shrink-0 transition-colors',
                            isActive ? 'text-teal-400' : 'text-slate-400 group-hover:text-slate-200'
                          )}
                        />
                        {!isCollapsed && <span className="truncate">{item.title}</span>}
                      </div>

                      {!isCollapsed && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.badge !== undefined && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-teal-500 text-slate-950">
                              {item.badge}
                            </span>
                          )}
                          {isActive && (
                            <div className="w-1.5 h-1.5 rounded-full bg-teal-400 shadow-xs shadow-teal-400" />
                          )}
                        </div>
                      )}
                    </NavLink>

                    {/* Tooltip for collapsed sidebar */}
                    {isCollapsed && hoveredItem === item.to && (
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-semibold whitespace-nowrap shadow-xl z-50">
                        {item.title}
                        {item.badge !== undefined && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.2 rounded-full bg-teal-500 text-slate-950 font-bold">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Sidebar Collapse Toggle Button on Desktop */}
        {onToggleCollapse && (
          <div className="hidden lg:flex items-center justify-between p-3 border-t border-[#1e293b]/90 bg-[#070b12]">
            {!isCollapsed && (
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                <span className="text-xs text-slate-400 font-medium truncate">Online Workspace</span>
              </div>
            )}
            <button
              onClick={onToggleCollapse}
              className={cn(
                'p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition flex items-center justify-center',
                isCollapsed && 'w-full'
              )}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>
        )}
      </aside>
    </>
  );
};
