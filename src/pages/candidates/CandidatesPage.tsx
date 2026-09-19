import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search,
  Sparkles,
  MessageSquare,
  MapPin,
  Eye,
  Send,
  CheckCircle2,
  Clock,
  ChevronRight,
  Filter,
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { candidateService, CandidateMatchResult } from '@/services/candidateService';
import { jobService } from '@/services/jobService';
import { applicationService } from '@/services/applicationService';
import { chatService } from '@/services/chatService';
import { CandidateModel } from '@/types/candidate';
import { JobModel } from '@/types/job';
import { JobApplicationModel } from '@/types/application';
import { ROUTES } from '@/utils/constants';
import { formatDate } from '@/utils/formatters';

type TabType = 'suggestions' | 'invited' | 'accepted';

export const CandidatesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, recruiterProfile, isSubscribed } = useAuth();

  const initialTab = (searchParams.get('tab') as TabType) || 'suggestions';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  const [activeJobs, setActiveJobs] = useState<JobModel[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('all');
  const [candidatesPool, setCandidatesPool] = useState<CandidateModel[]>([]);
  const [applications, setApplications] = useState<JobApplicationModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [invitedCandidateIds, setInvitedCandidateIds] = useState<Set<string>>(new Set());

  const companyId = recruiterProfile?.companyId || user?.uid || '';

  // Sync tab with URL query param
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // 1. Stream Company's Active Jobs
  useEffect(() => {
    if (!companyId) return;

    const unsub = jobService.subscribeToCompanyJobs(companyId, (allJobs) => {
      const active = allJobs.filter((j) => j.status === 'active');
      setActiveJobs(active);
    });

    return () => unsub();
  }, [companyId]);

  // 2. Stream Applications for Company
  useEffect(() => {
    if (!companyId) return;

    const unsub = applicationService.subscribeToCompanyApplications(
      companyId,
      (apps) => {
        setApplications(apps);
        const invited = new Set<string>();
        apps.forEach((a) => {
          if (a.applicationStatus === 'invited') {
            invited.add(a.candidateId);
          }
        });
        setInvitedCandidateIds(invited);
      }
    );

    return () => unsub();
  }, [companyId]);

  // 3. Load Candidate Talent Pool
  useEffect(() => {
    const loadCandidates = async () => {
      try {
        setLoading(true);
        const list = await candidateService.getAllCandidates(100);
        setCandidatesPool(list);
      } catch (err) {
        console.error('Error fetching candidates:', err);
      } finally {
        setLoading(false);
      }
    };
    loadCandidates();
  }, []);

  // Compute Suggestions (>= 40% match with active jobs)
  const suggestionsList: CandidateMatchResult[] = useMemo(() => {
    if (activeJobs.length === 0 || candidatesPool.length === 0) return [];

    const targetJobs =
      selectedJobId === 'all'
        ? activeJobs
        : activeJobs.filter((j) => j.jobId === selectedJobId);

    const results: CandidateMatchResult[] = [];
    const seenCandidates = new Set<string>();

    for (const job of targetJobs) {
      const jobSkills = job.mustHaveSkills || job.skills || [];
      if (jobSkills.length === 0) continue;

      for (const cand of candidatesPool) {
        if (invitedCandidateIds.has(cand.uid) || seenCandidates.has(cand.uid)) {
          continue;
        }

        const score = candidateService.calculateSkillMatch(cand.skills || [], jobSkills);
        if (score >= 40) {
          const matchedSkills = (cand.skills || []).filter((s) =>
            jobSkills.some((js) => js.toLowerCase() === s.toLowerCase())
          );
          results.push({
            candidate: cand,
            matchedJob: job,
            matchScore: score,
            matchedSkills,
          });
          seenCandidates.add(cand.uid);
        }
      }
    }

    results.sort((a, b) => b.matchScore - a.matchScore);
    return results;
  }, [activeJobs, candidatesPool, selectedJobId, invitedCandidateIds]);

  // Filtered Applications for Invited / Accepted
  const invitedApplications = useMemo(() => {
    let filtered = applications.filter((a) => a.applicationStatus === 'invited');
    if (selectedJobId !== 'all') {
      filtered = filtered.filter((a) => a.jobId === selectedJobId);
    }
    return filtered;
  }, [applications, selectedJobId]);

  const acceptedApplications = useMemo(() => {
    let filtered = applications.filter((a) => a.applicationStatus === 'accepted');
    if (selectedJobId !== 'all') {
      filtered = filtered.filter((a) => a.jobId === selectedJobId);
    }
    return filtered;
  }, [applications, selectedJobId]);

  // Direct Invite action
  const handleInviteCandidate = async (match: CandidateMatchResult) => {
    if (!isSubscribed) {
      navigate(ROUTES.SUBSCRIPTION);
      return;
    }
    if (!user) return;

    try {
      setInvitingId(match.candidate.uid);
      await candidateService.inviteCandidate({
        candidateId: match.candidate.uid,
        jobId: match.matchedJob.jobId,
        companyId,
        recruiterId: user.uid,
      });

      setInvitedCandidateIds((prev) => new Set(prev).add(match.candidate.uid));
    } catch (err: unknown) {
      console.error('Error inviting candidate:', err);
    } finally {
      setInvitingId(null);
    }
  };

  // Direct Chat action
  const handleOpenChat = async (app: JobApplicationModel) => {
    if (!isSubscribed) {
      navigate(ROUTES.SUBSCRIPTION);
      return;
    }
    if (!user) return;

    try {
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
    }
  };


  return (
    <div className="space-y-6 pb-12">
      {/* Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-teal-50 border border-teal-200/60 flex items-center justify-center text-teal-600 shrink-0">
            <Sparkles className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Candidate Connect
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Source verified talent matching your open positions with &ge;40% skill match criteria.
            </p>
          </div>
        </div>

        {/* Job Filter Selector */}
        {activeJobs.length > 0 && (
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="bg-transparent border-none focus:outline-none cursor-pointer text-slate-900 font-bold"
            >
              <option value="all">All Active Openings ({activeJobs.length})</option>
              {activeJobs.map((j) => (
                <option key={j.jobId} value={j.jobId}>
                  {j.roleName} ({j.jobLocation?.city || 'India'})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        {/* 3 Verified Tabs */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => handleTabChange('suggestions')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === 'suggestions'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>SUGGESTIONS</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-teal-100 text-teal-800 font-extrabold">
              {suggestionsList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('invited')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === 'invited'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Send className="w-3.5 h-3.5 text-purple-500" />
            <span>INVITED</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800 font-extrabold">
              {invitedApplications.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('accepted')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === 'accepted'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>ACCEPTED</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-extrabold">
              {acceptedApplications.length}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidates..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
          />
        </div>
      </div>

      {/* Tab 1: Suggestions */}
      {activeTab === 'suggestions' && (
        <>
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center text-slate-400">
              <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs font-medium">Finding candidate matches...</p>
            </div>
          ) : suggestionsList.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 border border-slate-200/90 text-center shadow-xs">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-4">
                <Sparkles className="w-8 h-8 text-amber-400" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No Suggestions Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Make sure you have active job postings with required skills to generate candidate suggestions (&ge;40% match).
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {suggestionsList
                .filter((item) => {
                  const q = searchQuery.toLowerCase().trim();
                  if (!q) return true;
                  return (
                    item.candidate.fullName.toLowerCase().includes(q) ||
                    item.matchedSkills.some((s: string) => s.toLowerCase().includes(q))
                  );
                })
                .map((item) => {
                  const cand = item.candidate;
                  const isInvited = invitedCandidateIds.has(cand.uid);
                  const isInviting = invitingId === cand.uid;

                  return (
                    <div
                      key={cand.uid}
                      onClick={() =>
                        navigate(`/candidates/${cand.uid}?jobId=${item.matchedJob.jobId}`, {
                          state: { candidate: cand, job: item.matchedJob },
                        })
                      }
                      className="group bg-white rounded-2xl p-6 border border-slate-200/90 hover:border-slate-300 hover:shadow-md transition cursor-pointer flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-700 to-slate-800 text-white font-bold text-base flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-slate-100">
                              {cand.photoUrl || cand.avatarUrl ? (
                                <img
                                  src={cand.photoUrl || cand.avatarUrl}
                                  alt={cand.fullName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                cand.fullName.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-700 transition truncate">
                                {cand.fullName}
                              </h3>
                              <p className="text-xs text-slate-500 truncate">
                                {cand.headline || 'Software Professional'}
                              </p>
                            </div>
                          </div>

                          <span className="text-[11px] font-black text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/60 shrink-0">
                            {item.matchScore}% Match
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">
                            {typeof cand.location === 'object' && cand.location !== null
                              ? (cand.location as { city?: string }).city || 'India'
                              : cand.location || 'India'}
                          </span>
                        </div>


                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {item.matchedSkills.slice(0, 4).map((skill: string, idx: number) => (
                            <span
                              key={idx}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>


                        <p className="text-[11px] text-slate-400 font-medium">
                          Opening: <strong className="text-slate-700">{item.matchedJob.roleName}</strong>
                        </p>
                      </div>

                      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900 inline-flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" /> View Profile
                        </span>

                        <button
                          type="button"
                          disabled={isInvited || isInviting}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInviteCandidate(item);
                          }}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition ${
                            isInvited
                              ? 'bg-slate-100 text-slate-400 cursor-default'
                              : 'bg-slate-900 hover:bg-black text-white shadow-xs'
                          }`}
                        >
                          <Send className="w-3 h-3" />
                          {isInviting ? 'Inviting...' : isInvited ? 'Invited' : 'Invite'}
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </>
      )}

      {/* Tab 2: Invited Candidates */}
      {activeTab === 'invited' && (
        <>
          {invitedApplications.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 border border-slate-200/90 text-center shadow-xs">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-4">
                <Send className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No Pending Invitations</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Invitations sent to candidates will appear here while waiting for candidate responses.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {invitedApplications.map((app) => (
                <div
                  key={app.applicationId}
                  onClick={() =>
                    navigate(`/candidates/${app.candidateId}?jobId=${app.jobId}`, {
                      state: { application: app },
                    })
                  }
                  className="group bg-white rounded-2xl p-6 border border-slate-200/90 hover:border-slate-300 hover:shadow-md transition cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                          Invited
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition mt-2">
                          {app.candidateName || 'Candidate'}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          {app.jobTitle || 'Role Opening'}
                        </p>
                      </div>
                      <Clock className="w-4 h-4 text-purple-400 shrink-0" />
                    </div>

                    <p className="text-xs text-slate-400">
                      Invited on {app.createdAt ? formatDate(app.createdAt) : 'Recently'}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">Status: Pending Candidate Response</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Tab 3: Accepted Candidates */}
      {activeTab === 'accepted' && (
        <>
          {acceptedApplications.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 border border-slate-200/90 text-center shadow-xs">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No Accepted Invitations</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                When candidates accept your invitations, they will appear here ready for direct encrypted messaging.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {acceptedApplications.map((app) => (
                <div
                  key={app.applicationId}
                  onClick={() =>
                    navigate(`/candidates/${app.candidateId}?jobId=${app.jobId}`, {
                      state: { application: app },
                    })
                  }
                  className="group bg-white rounded-2xl p-6 border border-slate-200/90 hover:border-slate-300 hover:shadow-md transition cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Accepted
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition mt-2">
                          {app.candidateName || 'Candidate'}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          {app.jobTitle || 'Role Opening'}
                        </p>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    </div>

                    <p className="text-xs text-slate-400">
                      Accepted on {app.createdAt ? formatDate(app.createdAt) : 'Recently'}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600">View Profile &rarr;</span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenChat(app);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition shadow-xs"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Message
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
