import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Users,
  Send,
  Sparkles,
  Plus,
  ArrowRight,
  MapPin,
  Calendar,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { jobService } from '@/services/jobService';
import { candidateService, CandidateMatchResult } from '@/services/candidateService';
import { applicationService } from '@/services/applicationService';
import { JobModel } from '@/types/job';
import { JobApplicationModel } from '@/types/application';
import { ROUTES } from '@/utils/constants';
import { formatDate, isNewRecruiterUser } from '@/utils/formatters';
import { PostJobChoiceModal } from '@/components/jobs/PostJobChoiceModal';

export const DashboardPage: React.FC = () => {
  const { user, recruiterProfile, companyProfile, isSubscribed } = useAuth();
  const navigate = useNavigate();

  const [jobs, setJobs] = useState<JobModel[]>([]);
  const [applications, setApplications] = useState<JobApplicationModel[]>([]);
  const [suitableCandidates, setSuitableCandidates] = useState<CandidateMatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobsTab, setJobsTab] = useState<'active' | 'closed'>('active');
  const [invitingCandidateId, setInvitingCandidateId] = useState<string | null>(null);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [postModalOpen, setPostModalOpen] = useState(false);

  const companyId = recruiterProfile?.companyId || user?.uid || '';
  const recruiterName = recruiterProfile?.fullName || user?.displayName || user?.email?.split('@')[0] || 'Recruiter';
  const companyName = companyProfile?.profile?.companyName || 'TalentBay Recruiter';

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // 1. Subscribe to Company Jobs
    const unsubJobs = jobService.subscribeToCompanyJobs(
      companyId,
      async (allJobs) => {
        setJobs(allJobs);

        try {
          // 2. Fetch Applications for Company
          const apps = await applicationService.getApplicationsByCompanyId(companyId);
          setApplications(apps);

          // Track already invited candidate IDs
          const invitedSet = new Set<string>();
          apps.forEach((a) => {
            if (a.applicationStatus === 'invited') {
              invitedSet.add(a.candidateId);
            }
          });
          setInvitedIds(invitedSet);

          // 3. Compute Suitable Candidates matching active jobs (>=40% skill match)
          const active = allJobs.filter((j) => j.status === 'active');
          if (active.length > 0) {
            const matches = await candidateService.getSuitableCandidatesForCompany(companyId, active);
            setSuitableCandidates(matches.slice(0, 6));
          } else {
            setSuitableCandidates([]);
          }
        } catch (err) {
          console.error('[DashboardPage] Error loading dashboard metrics:', err);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error('[DashboardPage] Error subscribing to jobs:', err);
        setLoading(false);
      }
    );

    return () => unsubJobs();
  }, [companyId]);

  const activeJobs = jobs.filter((j) => j.status === 'active');
  const closedJobs = jobs.filter((j) => j.status === 'closed');

  // Metrics matching Flutter
  const appliedCount = applications.filter((a) => a.applicationStatus === 'applied').length;
  const pendingInvitationsCount = applications.filter((a) => a.applicationStatus === 'invited').length;
  const totalApplicationsCount = applications.length;

  // Handle direct Invite from Suitable Candidates carousel
  const handleInvite = async (match: CandidateMatchResult) => {
    if (!isSubscribed) {
      navigate(ROUTES.SUBSCRIPTION);
      return;
    }
    if (!user) return;

    try {
      setInvitingCandidateId(match.candidate.uid);
      const targetJob = match.matchedJob;
      await candidateService.inviteCandidate({
        candidateId: match.candidate.uid,
        jobId: targetJob.jobId,
        companyId: targetJob.companyId || companyId,
        recruiterId: user.uid,
      });

      setInvitedIds((prev) => new Set(prev).add(match.candidate.uid));
      setFeedbackMsg(`Invited ${match.candidate.fullName} for "${targetJob.roleName}"`);
      setTimeout(() => setFeedbackMsg(null), 3500);
    } catch (err: unknown) {
      console.error('Error inviting candidate:', err);
      setFeedbackMsg(`Failed to send invitation: ${err instanceof Error ? err.message : 'Error'}`);
    } finally {
      setInvitingCandidateId(null);
    }

  };

  const displayedJobs = jobsTab === 'active' ? activeJobs : closedJobs;

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Dashboard Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-teal-700 to-slate-800 text-white font-black text-xl sm:text-2xl flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
            {companyProfile?.profile?.logoUrl ? (
              <img
                src={companyProfile.profile.logoUrl}
                alt={companyName}
                className="w-full h-full object-cover"
              />
            ) : (
              companyName.charAt(0).toUpperCase()
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {isNewRecruiterUser(user) ? `Welcome, ${recruiterName}!` : `Welcome back, ${recruiterName}!`}
              </h1>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200/60">
                {companyName}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Live recruitment overview & AI talent matches
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <NavLink
            to={ROUTES.CANDIDATES}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Candidate Connect</span>
          </NavLink>

          <button
            type="button"
            onClick={() => setPostModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-xl transition shadow-xs hover:shadow cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Post a Job</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-teal-600" />
          {feedbackMsg}
        </div>
      )}

      {/* 2. Live Monitoring Section (Matching Flutter _LiveMonitoringSection) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Live Monitoring
          </h2>
          <span className="text-xs text-slate-400 font-medium">Real-time stats</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Applied Candidates */}
          <NavLink
            to={ROUTES.APPLICATIONS}
            className="group bg-white rounded-2xl p-5 border border-slate-200/90 hover:border-teal-300 hover:shadow-md transition flex items-center justify-between"
          >
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Applied Applicants
              </span>
              <p className="text-2xl font-black text-slate-900 group-hover:text-teal-700 transition">
                {appliedCount}
              </p>
              <p className="text-[11px] text-slate-400 font-medium">
                {totalApplicationsCount} total received
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200/60 flex items-center justify-center text-teal-600 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </NavLink>

          {/* Card 2: Pending Invitations */}
          <NavLink
            to={`${ROUTES.CANDIDATES}?tab=invited`}
            className="group bg-white rounded-2xl p-5 border border-slate-200/90 hover:border-purple-300 hover:shadow-md transition flex items-center justify-between"
          >
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Pending Invitations
              </span>
              <p className="text-2xl font-black text-slate-900 group-hover:text-purple-700 transition">
                {pendingInvitationsCount}
              </p>
              <p className="text-[11px] text-slate-400 font-medium">
                Candidate Connect pipeline
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200/60 flex items-center justify-center text-purple-600 group-hover:scale-105 transition-transform">
              <Send className="w-5 h-5" />
            </div>
          </NavLink>

          {/* Card 3: Active Job Openings */}
          <NavLink
            to={ROUTES.JOBS}
            className="group bg-white rounded-2xl p-5 border border-slate-200/90 hover:border-slate-300 hover:shadow-md transition flex items-center justify-between"
          >
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Active Openings
              </span>
              <p className="text-2xl font-black text-slate-900 group-hover:text-slate-950 transition">
                {activeJobs.length}
              </p>
              <p className="text-[11px] text-slate-400 font-medium">
                {closedJobs.length} archived closed
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 group-hover:scale-105 transition-transform">
              <Briefcase className="w-5 h-5" />
            </div>
          </NavLink>
        </div>
      </div>

      {/* 3. Suitable Candidates Section (Matching Flutter _SuitableCandidatesSection) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Suitable Candidates
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Top candidate talent matching your active job criteria (&ge;40% skill match)
            </p>
          </div>

          <NavLink
            to={ROUTES.CANDIDATES}
            className="text-xs font-bold text-teal-700 hover:text-teal-800 inline-flex items-center gap-1 group"
          >
            <span>View All Matches</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </NavLink>
        </div>

        {loading ? (
          <div className="p-8 bg-white rounded-2xl border border-slate-200/90 text-center text-xs text-slate-400">
            Finding best talent matches...
          </div>
        ) : suitableCandidates.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-slate-200/90 text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              No High-Match Candidates Found
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Post new job openings or explore candidate profiles in Candidate Connect.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suitableCandidates.map((item) => {
              const cand = item.candidate;
              const isInvited = invitedIds.has(cand.uid);
              const isInviting = invitingCandidateId === cand.uid;

              return (
                <div
                  key={cand.uid}
                  className="bg-white rounded-2xl p-5 border border-slate-200/90 hover:border-slate-300 hover:shadow-md transition flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-teal-700 to-slate-800 text-white font-bold text-sm flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-slate-100">
                          {cand.profileImageUrl ? (
                            <img
                              src={cand.profileImageUrl}
                              alt={cand.fullName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            cand.fullName.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4
                            onClick={() =>
                              navigate(`/candidates/${cand.uid}?jobId=${item.matchedJob.jobId}`, {
                                state: { candidate: cand, job: item.matchedJob },
                              })
                            }
                            className="text-xs sm:text-sm font-bold text-slate-900 hover:text-teal-700 transition cursor-pointer truncate"
                          >
                            {cand.fullName}
                          </h4>
                          <p className="text-[11px] text-slate-500 truncate">
                            {cand.headline || cand.jobPreferences?.roles?.[0] || 'Software Professional'}
                          </p>
                        </div>
                      </div>

                      <span className="text-[11px] font-black text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/60 shrink-0">
                        {item.matchScore}% Match
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {typeof cand.location === 'object' && cand.location !== null
                          ? (cand.location as { city?: string }).city || 'India'
                          : cand.location || 'India'}
                      </span>
                    </div>


                    {/* Matched Skills */}
                    <div className="flex flex-wrap gap-1">
                      {item.matchedSkills.slice(0, 3).map((skill: string, idx: number) => (
                        <span
                          key={idx}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>


                    <p className="text-[10px] text-slate-400 font-medium truncate">
                      Matches: <strong className="text-slate-700">{item.matchedJob.roleName}</strong>
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/candidates/${cand.uid}?jobId=${item.matchedJob.jobId}`, {
                          state: { candidate: cand, job: item.matchedJob },
                        })
                      }
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View Profile
                    </button>

                    <button
                      type="button"
                      disabled={isInvited || isInviting}
                      onClick={() => handleInvite(item)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                        isInvited
                          ? 'bg-slate-100 text-slate-400 cursor-default'
                          : 'bg-slate-900 hover:bg-black text-white shadow-xs'
                      }`}
                    >
                      <Send className="w-3 h-3" />
                      {isInviting ? 'Sending...' : isInvited ? 'Invited' : 'Invite'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Recent Positions Section (Matching Flutter _RecentPositionsSection with Active / Closed toggle) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Recent Positions
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review active openings or explore archived closed positions
            </p>
          </div>

          {/* Active / Closed Toggle Tabs */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setJobsTab('active')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                jobsTab === 'active'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Active ({activeJobs.length})
            </button>
            <button
              type="button"
              onClick={() => setJobsTab('closed')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                jobsTab === 'closed'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Closed ({closedJobs.length})
            </button>
          </div>
        </div>

        {displayedJobs.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-slate-200/90 text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
              <Briefcase className="w-6 h-6" />
            </div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              No {jobsTab === 'active' ? 'Active' : 'Closed'} Positions
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {jobsTab === 'active'
                ? 'Create your first job opening to start receiving applicants.'
                : 'No archived closed jobs yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedJobs.slice(0, 6).map((job) => (
              <div
                key={job.jobId}
                onClick={() => navigate(`/jobs/${job.jobId}`)}
                className="group bg-white rounded-2xl p-5 border border-slate-200/90 hover:border-slate-300 hover:shadow-md transition cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          job.status === 'active'
                            ? 'bg-teal-50 text-teal-700 border border-teal-200/60'
                            : 'bg-slate-100 text-slate-500 border border-slate-200 line-through'
                        }`}
                      >
                        {job.status}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-teal-700 transition truncate mt-1.5">
                        {job.roleName}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium truncate">
                        {job.designationName}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition shrink-0" />
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 pt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {job.jobLocation?.city || 'Location N/A'}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {job.createdAt ? formatDate(job.createdAt) : 'Recently'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">
                    Vacancies: <strong className="text-slate-800">{job.vacancies || 1}</strong>
                  </span>
                  <span className="font-bold text-teal-700 group-hover:underline">
                    View Details &rarr;
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <PostJobChoiceModal
        isOpen={postModalOpen}
        onClose={() => setPostModalOpen(false)}
      />
    </div>
  );
};
