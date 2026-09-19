import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileCheck,
  Search,
  Sparkles,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Filter,
  Calendar,
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { applicationService } from '@/services/applicationService';
import { jobService } from '@/services/jobService';
import { chatService } from '@/services/chatService';
import { JobApplicationModel, ApplicationStatus } from '@/types/application';
import { JobModel } from '@/types/job';
import { ROUTES } from '@/utils/constants';
import { formatDate } from '@/utils/formatters';

const STATUS_TABS: { id: ApplicationStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'applied', label: 'Applied' },
  { id: 'invited', label: 'Invited' },
  { id: 'shortlisted', label: 'Shortlisted' },
  { id: 'hired', label: 'Hired' },
  { id: 'rejected', label: 'Rejected' },
];

export const ApplicationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, recruiterProfile, isSubscribed } = useAuth();

  const [applications, setApplications] = useState<JobApplicationModel[]>([]);
  const [jobs, setJobs] = useState<JobModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState<ApplicationStatus | 'all'>('all');
  const [selectedJobId, setSelectedJobId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const companyId = recruiterProfile?.companyId || user?.uid || '';

  // 1. Subscribe to Company Jobs
  useEffect(() => {
    if (!companyId) return;
    const unsub = jobService.subscribeToCompanyJobs(companyId, (allJobs) => {
      setJobs(allJobs);
    });
    return () => unsub();
  }, [companyId]);

  // 2. Subscribe to Company Applications
  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = applicationService.subscribeToCompanyApplications(
      companyId,
      (apps) => {
        setApplications(apps);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching applications:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [companyId]);

  // Status Action (Shortlist, Hire, Reject)
  const handleUpdateStatus = async (app: JobApplicationModel, newStatus: ApplicationStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isSubscribed) {
      navigate(ROUTES.SUBSCRIPTION);
      return;
    }

    try {
      setActionLoadingId(app.applicationId);
      await applicationService.updateApplicationStatus(app.applicationId, newStatus);
      // If hired or rejected, clean up chat if appropriate
      if (['rejected', 'hired'].includes(newStatus) && user) {
        try {
          const chatId = await chatService.getOrCreateChat({
            jobId: app.jobId,
            candidateId: app.candidateId,
            recruiterId: app.recruiterId || user.uid,
          });
          await chatService.deleteChat(chatId);
        } catch (e) {
          console.warn('Chat deletion cleanup', e);
        }
      }
    } catch (err: unknown) {
      console.error('Error updating status:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Chat message launcher
  const handleOpenChat = async (app: JobApplicationModel, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isSubscribed) {
      navigate(ROUTES.SUBSCRIPTION);
      return;
    }
    if (!user) return;

    try {
      setActionLoadingId(app.applicationId);
      const chatId = await chatService.getOrCreateChat({
        jobId: app.jobId,
        candidateId: app.candidateId,
        recruiterId: user.uid,
      });

      navigate(ROUTES.CHAT, {
        state: {
          activeChatId: chatId,
          candidateId: app.candidateId,
          candidateName: app.candidateName || 'Candidate',
          jobTitle: app.jobTitle || 'Role',
        },
      });
    } catch (err: unknown) {
      console.error('Error opening chat:', err);
    } finally {
      setActionLoadingId(null);
    }
  };


  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const matchesStatus =
        activeStatus === 'all' ? true : app.applicationStatus === activeStatus;
      const matchesJob =
        selectedJobId === 'all' ? true : app.jobId === selectedJobId;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (app.candidateName && app.candidateName.toLowerCase().includes(q)) ||
        (app.jobTitle && app.jobTitle.toLowerCase().includes(q));

      return matchesStatus && matchesJob && matchesSearch;
    });
  }, [applications, activeStatus, selectedJobId, searchQuery]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-teal-50 border border-teal-200/60 flex items-center justify-center text-teal-600 shrink-0">
            <FileCheck className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Job Applications
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Review applicant resumes, verify AI match scores, and progress candidates through hiring stages.
            </p>
          </div>
        </div>

        {/* Job Filter Dropdown */}
        {jobs.length > 0 && (
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="bg-transparent border-none focus:outline-none cursor-pointer text-slate-900 font-bold"
            >
              <option value="all">All Positions ({jobs.length})</option>
              {jobs.map((j) => (
                <option key={j.jobId} value={j.jobId}>
                  {j.roleName} ({j.jobLocation?.city || 'India'})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        {/* Status Tabs */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl overflow-x-auto scrollbar-none w-fit">
          {STATUS_TABS.map((tab) => {
            const count =
              tab.id === 'all'
                ? applications.length
                : applications.filter((a) => a.applicationStatus === tab.id).length;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveStatus(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition shrink-0 ${
                  activeStatus === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-extrabold">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidate name..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
          />
        </div>
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-slate-400">
          <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs font-medium">Loading applications...</p>
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200/90 text-center shadow-xs">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-4">
            <FileCheck className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {searchQuery ? 'No Matching Applications' : `No ${activeStatus === 'all' ? '' : activeStatus} Applications`}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No candidate matched your search query "${searchQuery}".`
              : 'Incoming applications from candidates will appear in real time.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Candidate</th>
                  <th className="px-4 py-3.5">Position Applied</th>
                  <th className="px-4 py-3.5">Applied Date</th>
                  <th className="px-4 py-3.5">AI Match</th>
                  <th className="px-4 py-3.5">Current Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredApplications.map((app) => {
                  const status = app.applicationStatus;
                  const isLoadingAction = actionLoadingId === app.applicationId;

                  return (
                    <tr
                      key={app.applicationId}
                      onClick={() =>
                        navigate(`/candidates/${app.candidateId}?jobId=${app.jobId}`, {
                          state: { application: app },
                        })
                      }
                      className="hover:bg-slate-50 transition cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-700 to-slate-800 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                            {app.candidateName?.charAt(0).toUpperCase() || 'C'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{app.candidateName || 'Candidate'}</p>
                            <p className="text-[11px] text-slate-400 font-medium">Click to view full profile</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 font-semibold text-slate-900">
                        {app.jobTitle || 'Role Opening'}
                      </td>

                      <td className="px-4 py-4 text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{app.createdAt ? formatDate(app.createdAt) : 'Recently'}</span>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        {app.aiMatchScore !== undefined && app.aiMatchScore !== null ? (
                          <span className="inline-flex items-center gap-1 text-xs font-black text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/60">
                            <Sparkles className="w-3 h-3 text-teal-600" />
                            {app.aiMatchScore}%
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Not evaluated</span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
                            status === 'shortlisted'
                              ? 'bg-teal-50 text-teal-700 border-teal-200'
                              : status === 'hired'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : status === 'rejected'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : status === 'invited'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : status === 'accepted'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {status === 'applied' && (
                            <>
                              <button
                                type="button"
                                disabled={isLoadingAction}
                                onClick={(e) => handleUpdateStatus(app, 'shortlisted', e)}
                                className="px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-black rounded-lg transition shadow-xs disabled:opacity-50 inline-flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3 h-3" /> Shortlist
                              </button>
                              <button
                                type="button"
                                disabled={isLoadingAction}
                                onClick={(e) => handleUpdateStatus(app, 'rejected', e)}
                                className="px-2.5 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition disabled:opacity-50 inline-flex items-center gap-1"
                              >
                                <XCircle className="w-3 h-3" /> Reject
                              </button>
                            </>
                          )}

                          {status === 'shortlisted' && (
                            <>
                              <button
                                type="button"
                                disabled={isLoadingAction}
                                onClick={(e) => handleOpenChat(app, e)}
                                className="px-3 py-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition disabled:opacity-50 inline-flex items-center gap-1"
                              >
                                <MessageSquare className="w-3 h-3" /> Message
                              </button>
                              <button
                                type="button"
                                disabled={isLoadingAction}
                                onClick={(e) => handleUpdateStatus(app, 'hired', e)}
                                className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-xs disabled:opacity-50 inline-flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3 h-3" /> Hire
                              </button>
                              <button
                                type="button"
                                disabled={isLoadingAction}
                                onClick={(e) => handleUpdateStatus(app, 'rejected', e)}
                                className="px-2.5 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition disabled:opacity-50 inline-flex items-center gap-1"
                              >
                                <XCircle className="w-3 h-3" /> Reject
                              </button>
                            </>
                          )}

                          {(status === 'invited' || status === 'accepted') && (
                            <button
                              type="button"
                              disabled={isLoadingAction}
                              onClick={(e) => handleOpenChat(app, e)}
                              className="px-3 py-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition disabled:opacity-50 inline-flex items-center gap-1"
                            >
                              <MessageSquare className="w-3 h-3" /> Message
                            </button>
                          )}

                          {(status === 'hired' || status === 'rejected') && (
                            <span className="text-xs text-slate-400 font-semibold px-2 py-1">
                              Decision Finalized
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
