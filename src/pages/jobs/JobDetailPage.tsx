import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, NavLink } from 'react-router-dom';
import {
  Briefcase,
  MapPin,
  Users,
  IndianRupee,
  ArrowLeft,
  Edit,
  XCircle,
  RotateCcw,
  CheckCircle2,
  X,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

import { jobService } from '@/services/jobService';
import { applicationService } from '@/services/applicationService';
import { chatService } from '@/services/chatService';
import { useAuth } from '@/hooks/useAuth';
import { JobModel } from '@/types/job';
import { JobApplicationModel, ApplicationStatus } from '@/types/application';
import { Button } from '@/components/common/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { ROUTES } from '@/utils/constants';
import { formatDate } from '@/utils/formatters';

export const JobDetailPage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { user, isSubscribed } = useAuth();

  const [job, setJob] = useState<JobModel | null>(null);
  const [applications, setApplications] = useState<JobApplicationModel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [repostModalOpen, setRepostModalOpen] = useState(false);
  const [repostVacancies, setRepostVacancies] = useState(1);
  const [isReposting, setIsReposting] = useState(false);
  const [updatingAppId, setUpdatingAppId] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;

    let unsubApps: () => void = () => {};

    const loadJobData = async () => {
      try {
        setLoading(true);
        setError(null);
        const jobData = await jobService.getJobById(jobId);
        if (!jobData) {
          setError('Job opening not found or has been removed.');
          setLoading(false);
          return;
        }
        setJob(jobData);
        setRepostVacancies(jobData.vacancies || 1);

        // Subscribe to real-time applications
        unsubApps = applicationService.subscribeToJobApplications(
          jobId,
          (apps) => {
            setApplications(apps);
          },
          (err) => {
            console.error('[JobDetailPage] Error subscribing to applications:', err);
          }
        );
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load job details');
      } finally {
        setLoading(false);
      }
    };

    loadJobData();

    return () => {
      unsubApps();
    };
  }, [jobId]);

  const handleCloseJob = async () => {
    if (!jobId) return;
    try {
      setIsClosing(true);
      await jobService.closeJob(jobId);
      setCloseModalOpen(false);
      // Reload job state
      const updated = await jobService.getJobById(jobId);
      setJob(updated);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to close job.');
    } finally {
      setIsClosing(false);
    }
  };

  const handleRepostJob = async () => {
    if (!jobId) return;
    if (!isSubscribed) {
      navigate(ROUTES.SUBSCRIPTION);
      return;
    }
    try {
      setIsReposting(true);
      const newJobId = await jobService.repostJob(jobId, Number(repostVacancies) || 1);
      setRepostModalOpen(false);
      navigate(`/jobs/${newJobId}`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to repost job.');
    } finally {
      setIsReposting(false);
    }
  };

  const handleUpdateStatus = async (appId: string, newStatus: ApplicationStatus) => {
    if (!isSubscribed) {
      navigate(ROUTES.SUBSCRIPTION);
      return;
    }
    try {
      setUpdatingAppId(appId);
      await applicationService.updateApplicationStatus(appId, newStatus);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update application status.');
    } finally {
      setUpdatingAppId(null);
    }
  };

  const handleStartChat = async (candidateId: string) => {
    if (!jobId || !user?.uid) return;
    if (!isSubscribed) {
      navigate(ROUTES.SUBSCRIPTION);
      return;
    }
    try {
      const chatId = await chatService.getOrCreateChat({
        jobId,
        candidateId,
        recruiterId: user.uid,
      });
      navigate(ROUTES.CHAT, { state: { activeChatId: chatId } });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to start chat conversation.');
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center items-center">
        <LoadingSpinner label="Loading job opening..." />
      </div>
    );
  }


  if (error || !job) {
    return (
      <div className="py-12">
        <ErrorState
          title="Job Details Unavailable"
          message={error || 'Unable to retrieve this job opening.'}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  const isClosed = job.status === 'closed';

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Navigation & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(ROUTES.JOBS)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
            title="Back to Jobs"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {job.roleName || job.title}
              </h1>
              <span
                className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                  isClosed
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {job.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {job.designationName || job.department} • Posted {formatDate(job.createdAt || job.postedAt)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          {!isClosed ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/jobs/${job.jobId || job.id}/edit`)}
                leftIcon={<Edit className="w-4 h-4" />}
              >
                Edit Job
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setCloseModalOpen(true)}
                leftIcon={<XCircle className="w-4 h-4" />}
              >
                Close Job
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setRepostModalOpen(true)}
              leftIcon={<RotateCcw className="w-4 h-4" />}
            >
              Repost Job
            </Button>
          )}
        </div>
      </div>

      {/* Main Grid: Job Specs on Left, Summary Stats on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Full Job Description & Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Specs Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-slate-400">Location</p>
                <p className="text-xs font-semibold text-slate-800 truncate">
                  {job.jobLocation ? `${job.jobLocation.city}, ${job.jobLocation.state || job.jobLocation.country}` : 'India'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <IndianRupee className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-slate-400">Salary</p>
                <p className="text-xs font-semibold text-slate-800 truncate">
                  {job.salaryRange || job.salary ? `₹${(job.salaryRange?.min || job.salary?.min || 0).toLocaleString('en-IN')} - ₹${(job.salaryRange?.max || job.salary?.max || 0).toLocaleString('en-IN')}` : 'Disclosed'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Briefcase className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-slate-400">Experience</p>
                <p className="text-xs font-semibold text-slate-800 truncate">
                  {job.experienceRequired ? `${job.experienceRequired.minYears} - ${job.experienceRequired.maxYears} Yrs` : `${job.minExperienceYears || 0}-${job.maxExperienceYears || 5} Yrs`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-slate-400">Vacancies</p>
                <p className="text-xs font-semibold text-slate-800 truncate">
                  {job.vacancies || 1} Openings
                </p>
              </div>
            </div>
          </div>

          {/* Job Overview / Description */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-2">
                Job Description
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {job.jobDescription || job.description || 'No detailed description provided.'}
              </p>
            </div>

            {/* Skills */}
            {((job.mustHaveSkills && job.mustHaveSkills.length > 0) || (job.skills && job.skills.length > 0)) && (
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-2">
                  Required Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(job.mustHaveSkills || job.skills || []).map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1 text-xs font-semibold bg-teal-50 text-teal-800 rounded-lg border border-teal-200/60"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Key Info Summary */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Employment Specs
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Employment Type</span>
                <span className="font-semibold text-slate-800">{job.employmentType}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Work Mode</span>
                <span className="font-semibold text-slate-800">{job.workMode}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Offices</span>
                <span className="font-semibold text-slate-800">{job.officeCount || 1} Office</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Total Applicants</span>
                <span className="font-bold text-teal-700">{applications.length} Candidates</span>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-slate-500">Expires On</span>
                <span className="font-semibold text-slate-800">{formatDate(job.expiresAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Applicants Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Applicants for this Role ({applications.length})
            </h2>
            <p className="text-xs text-slate-500">
              Live applicant feed and candidate screening pipeline
            </p>
          </div>
        </div>

        {applications.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={<Users className="w-10 h-10 text-slate-300" />}
              title="No Applicants Yet"
              description="Candidates who apply or accept your invitations will appear here."
              action={
                <NavLink to={ROUTES.CANDIDATES}>
                  <Button variant="outline" size="sm" leftIcon={<Users className="w-4 h-4" />}>
                    Find Candidates in Connect
                  </Button>
                </NavLink>
              }
            />
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {applications.map((app) => {
              const matchScore = app.aiMatchScore ?? app.matchScore ?? 85;
              const status = app.applicationStatus || app.stage || 'applied';

              return (
                <div
                  key={app.applicationId || app.id}
                  className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-800 to-teal-900 text-white font-bold text-sm flex items-center justify-center shrink-0">
                      {app.candidateName?.charAt(0).toUpperCase() || 'C'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <NavLink
                          to={`/candidates/${app.candidateId}?jobId=${job.jobId || job.id}`}
                          state={{ application: app, job }}
                          className="font-bold text-sm text-slate-900 hover:text-teal-700 transition"
                        >
                          {app.candidateName}
                        </NavLink>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {status}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200/60 flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5 text-teal-600" />
                          {matchScore}% Match
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {app.candidateEmail || 'Candidate'} • Applied {formatDate(app.createdAt || app.appliedAt)}
                      </p>
                    </div>
                  </div>

                  {/* Actions per candidate application */}
                  <div className="flex items-center gap-2 shrink-0">
                    {status !== 'shortlisted' && status !== 'hired' && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={updatingAppId === (app.applicationId || app.id)}
                        onClick={() => handleUpdateStatus(app.applicationId || app.id, 'shortlisted')}
                        leftIcon={<CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                      >
                        Shortlist
                      </Button>
                    )}

                    {status !== 'hired' && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={updatingAppId === (app.applicationId || app.id)}
                        onClick={() => handleUpdateStatus(app.applicationId || app.id, 'hired')}
                        leftIcon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                      >
                        Hire
                      </Button>
                    )}

                    {status !== 'rejected' && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={updatingAppId === (app.applicationId || app.id)}
                        onClick={() => handleUpdateStatus(app.applicationId || app.id, 'rejected')}
                        leftIcon={<X className="w-3.5 h-3.5 text-rose-600" />}
                      >
                        Reject
                      </Button>
                    )}

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleStartChat(app.candidateId)}
                      leftIcon={<MessageSquare className="w-3.5 h-3.5" />}
                    >
                      Message
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Close Job Confirmation Modal */}
      {closeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Close this Job Position?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Closing this job will archive it and move it to Closed Positions. You can view past details or repost it at any time.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCloseModalOpen(false)}
                disabled={isClosing}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleCloseJob}
                disabled={isClosing}
              >
                {isClosing ? 'Closing...' : 'Confirm Close Job'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Repost Job Modal */}
      {repostModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Repost Job Opening</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              This will create a new active job posting cloned from this configuration with a fresh 30-day lifecycle.
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Number of Vacancies
              </label>
              <input
                type="number"
                min="1"
                value={repostVacancies}
                onChange={(e) => setRepostVacancies(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRepostModalOpen(false)}
                disabled={isReposting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleRepostJob}
                disabled={isReposting}
              >
                {isReposting ? 'Reposting...' : 'Repost Now'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
