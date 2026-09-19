import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  FileCheck,
  MessageSquare,
  ChevronRight,
  Clock,
  CheckCheck,
} from 'lucide-react';

import { useNotifications } from '@/hooks/useNotifications';
import { NotificationItem, NotificationFilter } from '@/types';
import { formatDate } from '@/utils/formatters';
import { ROUTES } from '@/utils/constants';

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    unreadCount,
    readCount,
    totalCount,
    loading,
    activeFilter,
    setActiveFilter,
    filteredNotifications,
    markNotificationAsRead,
    markAllAsRead,
  } = useNotifications();

  const handleNotificationClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      await markNotificationAsRead(item.id);
    }

    if (item.type === 'message' || item.id.startsWith('chat_') || item.title?.toLowerCase().includes('message')) {
      const chatId = item.payloadId || (item.id.startsWith('chat_') ? item.id.replace('chat_', '') : '');
      if (chatId) {
        navigate(`/chat/${chatId}`, {
          state: {
            activeChatId: chatId,
            candidateId: item.candidateId,
            candidateName: item.candidateName,
            jobTitle: item.jobTitle,
          },
        });
      } else if (item.candidateId) {
        navigate(ROUTES.CHAT, {
          state: {
            candidateId: item.candidateId,
            candidateName: item.candidateName,
            jobTitle: item.jobTitle,
          },
        });
      } else {
        navigate(ROUTES.CHAT);
      }
    } else if (item.candidateId) {
      navigate(`/candidates/${item.candidateId}${item.jobId ? `?jobId=${item.jobId}` : ''}`);
    } else if (item.jobId) {
      navigate(`/jobs/${item.jobId}`);
    } else {
      navigate(ROUTES.APPLICATIONS);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-teal-50 dark:bg-teal-500/10 border border-teal-200/60 dark:border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
            <Bell className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Notifications
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Live updates on new applicants, invitations, and candidate engagement.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <>
              <button
                type="button"
                onClick={() => markAllAsRead()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/15 hover:bg-teal-100 dark:hover:bg-teal-500/25 border border-teal-200/80 dark:border-teal-500/30 rounded-xl transition"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark All Read</span>
              </button>

              <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-teal-50 dark:bg-teal-500/10 text-teal-800 dark:text-teal-300 border border-teal-200/80 dark:border-teal-500/30 shrink-0">
                {unreadCount} Unread
              </span>
            </>
          )}
        </div>
      </div>

      {/* Filter Tabs matching Flutter (All, Unread, Read) */}
      <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl w-fit border border-slate-200/60 dark:border-slate-700">
        {(['All', 'Unread', 'Read'] as NotificationFilter[]).map((filter) => {
          const count =
            filter === 'All'
              ? totalCount
              : filter === 'Unread'
              ? unreadCount
              : readCount;

          return (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition ${
                activeFilter === filter
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span>{filter}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-slate-400">
          <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs font-medium">Loading notifications...</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="bg-white dark:bg-[#111827] rounded-2xl p-12 border border-slate-200/90 dark:border-slate-800 text-center shadow-xs">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 mb-4">
            <Bell className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
            No {activeFilter === 'All' ? '' : activeFilter} Notifications
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            You are caught up with all candidate applications and message updates.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((item) => (
            <div
              key={item.id}
              onClick={() => handleNotificationClick(item)}
              className={`p-4 sm:p-5 rounded-2xl border transition flex items-start gap-4 cursor-pointer group ${
                item.isRead
                  ? 'bg-white dark:bg-[#111827] border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  : 'bg-teal-50/40 dark:bg-teal-950/20 border-teal-200/80 dark:border-teal-500/40 shadow-xs hover:border-teal-300 dark:hover:border-teal-500/60'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                  item.type === 'message' || item.title?.toLowerCase().includes('message')
                    ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400'
                    : 'bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-400'
                }`}
              >
                {item.type === 'message' || item.title?.toLowerCase().includes('message') ? (
                  <MessageSquare className="w-5 h-5" />
                ) : (
                  <FileCheck className="w-5 h-5" />
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition truncate">
                    {item.title}
                  </h4>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium shrink-0 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {item.createdAt ? formatDate(item.createdAt) : item.timeAgo || 'Recently'}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed break-words">
                  {item.content || item.message}
                </p>

                {(item.candidateName || item.jobTitle) && (
                  <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    {item.candidateName && (
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {item.candidateName}
                      </span>
                    )}
                    {item.candidateName && item.jobTitle && <span>•</span>}
                    {item.jobTitle && (
                      <span className="text-teal-700 dark:text-teal-400 font-semibold">
                        {item.jobTitle}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0 self-center">
                {!item.isRead && (
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600 dark:bg-teal-400 ring-2 ring-teal-100 dark:ring-teal-900" />
                )}
                <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
