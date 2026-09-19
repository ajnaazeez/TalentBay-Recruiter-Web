import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Archive,
  Search,
  RotateCcw,
  Building2,
  Calendar,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { jobService } from '@/services/jobService';
import { JobModel } from '@/types/job';
import { formatDate } from '@/utils/formatters';

export const ClosedJobsPage: React.FC = () => {
  const { user, recruiterProfile } = useAuth();
  const navigate = useNavigate();

  const [jobs, setJobs] = useState<JobModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [repostingJobId, setRepostingJobId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const companyId = recruiterProfile?.companyId;

  useEffect(() => {
    if (!companyId && !user?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    // Realtime subscription to closed jobs matching Flutter getJobsStream
    const targetCompanyId = companyId || user!.uid;
    const unsubscribe = jobService.subscribeToCompanyJobs(
      targetCompanyId,
      (allJobs) => {
        const closed = allJobs.filter((j) => j.status === 'closed');
        // Sort descending by expiresAt (or createdAt)
        closed.sort((a, b) => {
          const timeA = a.expiresAt ? new Date(a.expiresAt as string | number | Date).getTime() : 0;
          const timeB = b.expiresAt ? new Date(b.expiresAt as string | number | Date).getTime() : 0;
          return timeB - timeA;
        });

        setJobs(closed);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching closed jobs:', err);
        setError('Failed to load closed positions.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [companyId, user]);

  const filteredJobs = jobs.filter((job) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      job.roleName.toLowerCase().includes(q) ||
      job.designationName.toLowerCase().includes(q) ||
      (job.jobLocation?.city && job.jobLocation.city.toLowerCase().includes(q))
    );
  });

  const handleRepost = async (job: JobModel, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    try {
      setRepostingJobId(job.jobId);
      const newJobId = await jobService.repostJob(job.jobId);
      setSuccessMessage(`Job "${job.roleName}" reposted successfully!`);
      setTimeout(() => {
        setSuccessMessage(null);
        navigate(`/jobs/${newJobId}`);
      }, 1500);
    } catch (err: unknown) {
      console.error('Error reposting job:', err);
      setError(err instanceof Error ? err.message : 'Failed to repost job.');
    } finally {
      setRepostingJobId(null);
    }

  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
              <Archive className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Closed Positions
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Archived job postings. You can review past applicants or instantly repost to reactivate hiring.
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-6 max-w-md">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search closed jobs by role, designation, or city..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
            />
          </div>
        </div>
      </div>

      {/* Success Alert */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-sm font-medium flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-teal-600" />
          {successMessage}
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          {error}
        </div>
      )}

      {/* Content List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs font-medium">Loading closed positions...</p>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200/90 text-center shadow-xs">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-4">
            <Archive className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800 uppercase tracking-wider">
            {searchQuery ? 'No Matching Closed Positions' : 'No Closed Positions'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No closed job matches "${searchQuery}".`
              : 'When you close an active position, it will be safely archived here for your records.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredJobs.map((job) => (
            <div
              key={job.jobId}
              onClick={() => navigate(`/jobs/${job.jobId}`)}
              className="group bg-white rounded-2xl p-6 border border-slate-200/90 hover:border-slate-300 hover:shadow-md transition cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wider mb-2">
                      Closed
                    </span>
                    <h3 className="text-base font-bold text-slate-800 line-through decoration-slate-400 truncate group-hover:text-slate-900 transition">
                      {job.roleName}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                      {job.designationName}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition shrink-0" />
                </div>

                <div className="mt-4 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">
                      {job.jobLocation?.city || 'Location N/A'}, {job.jobLocation?.country || 'India'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      Closed: {job.expiresAt ? formatDate(job.expiresAt) : 'Archived'}
                    </span>
                  </div>
                </div>

                {job.mustHaveSkills && job.mustHaveSkills.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {job.mustHaveSkills.slice(0, 3).map((skill, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200"
                      >
                        {skill}
                      </span>
                    ))}
                    {job.mustHaveSkills.length > 3 && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded-md text-slate-400 font-medium">
                        +{job.mustHaveSkills.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/jobs/${job.jobId}`);
                  }}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View Details
                </button>

                <button
                  type="button"
                  disabled={repostingJobId === job.jobId}
                  onClick={(e) => handleRepost(job, e)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 active:bg-black rounded-xl transition shadow-xs disabled:opacity-50"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${repostingJobId === job.jobId ? 'animate-spin' : ''}`} />
                  {repostingJobId === job.jobId ? 'Reposting...' : 'Repost Job'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
