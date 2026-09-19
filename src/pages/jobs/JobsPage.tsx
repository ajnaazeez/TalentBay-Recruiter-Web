import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Plus,
  Search,
  Calendar,
  Users,
  ChevronRight,
  DollarSign,
  Building2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { jobService } from '@/services/jobService';
import { applicationService } from '@/services/applicationService';
import { JobModel } from '@/types/job';
import { formatDate } from '@/utils/formatters';
import { PostJobChoiceModal } from '@/components/jobs/PostJobChoiceModal';

export const JobsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, recruiterProfile } = useAuth();

  const [jobs, setJobs] = useState<JobModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'closed' | 'all'>('active');
  const [applicantCounts, setApplicantCounts] = useState<Record<string, number>>({});
  const [postModalOpen, setPostModalOpen] = useState(false);

  const companyId = recruiterProfile?.companyId || user?.uid || '';

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = jobService.subscribeToCompanyJobs(
      companyId,
      async (allJobs) => {
        setJobs(allJobs);
        try {
          const apps = await applicationService.getApplicationsByCompanyId(companyId);
          const counts: Record<string, number> = {};
          apps.forEach((a) => {
            counts[a.jobId] = (counts[a.jobId] || 0) + 1;
          });
          setApplicantCounts(counts);
        } catch (e) {
          console.warn('Could not load application counts', e);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error fetching jobs:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [companyId]);

  const activeCount = jobs.filter((j) => j.status === 'active').length;
  const closedCount = jobs.filter((j) => j.status === 'closed').length;

  const filteredJobs = jobs.filter((job) => {
    const matchesStatus =
      statusFilter === 'all' ? true : job.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      job.roleName.toLowerCase().includes(q) ||
      job.designationName.toLowerCase().includes(q) ||
      (job.jobLocation?.city && job.jobLocation.city.toLowerCase().includes(q)) ||
      (job.mustHaveSkills && job.mustHaveSkills.some((s) => s.toLowerCase().includes(q)));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-teal-50 border border-teal-200/60 flex items-center justify-center text-teal-600 shrink-0">
            <Briefcase className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Jobs & Positions
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Manage your company's open positions, track applicants, and monitor hiring pipeline.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setPostModalOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-xl transition shadow-xs hover:shadow shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Post a New Job</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
              statusFilter === 'active'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Active Openings</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-teal-100 text-teal-800 font-extrabold">
              {activeCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('closed')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
              statusFilter === 'closed'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Closed Positions</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-extrabold">
              {closedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
              statusFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({jobs.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by role, skill, or city..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition shadow-2xs"
          />
        </div>
      </div>

      {/* Jobs Grid */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-slate-400">
          <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs font-medium">Loading jobs from TalentBay...</p>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200/90 text-center shadow-xs">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-4">
            <Briefcase className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {searchQuery ? 'No Matching Positions' : `No ${statusFilter === 'all' ? '' : statusFilter} Jobs`}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No job matched your search query "${searchQuery}".`
              : 'Post a new job opening to start finding qualified candidates with AI scoring.'}
          </p>
          {!searchQuery && (
            <button
              type="button"
              onClick={() => setPostModalOpen(true)}
              className="mt-6 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Post Job Opening</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredJobs.map((job) => {
            const applicants = applicantCounts[job.jobId] || 0;
            const isClosed = job.status === 'closed';

            return (
              <div
                key={job.jobId}
                onClick={() => navigate(`/jobs/${job.jobId}`)}
                className="group bg-white rounded-2xl p-6 border border-slate-200/90 hover:border-slate-300 hover:shadow-md transition cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider mb-2 border ${
                          isClosed
                            ? 'bg-slate-100 text-slate-600 border-slate-200'
                            : 'bg-teal-50 text-teal-700 border-teal-200/70'
                        }`}
                      >
                        {job.status}
                      </span>
                      <h3
                        className={`text-base font-bold text-slate-900 group-hover:text-teal-700 transition truncate ${
                          isClosed ? 'line-through text-slate-600' : ''
                        }`}
                      >
                        {job.roleName}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                        {job.designationName}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-600 transition shrink-0" />
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
                        Posted: {job.createdAt ? formatDate(job.createdAt) : 'Recently'}
                      </span>
                    </div>

                    {job.salaryRange && (
                      <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>
                          ₹{job.salaryRange.min?.toLocaleString()} - ₹{job.salaryRange.max?.toLocaleString()} {job.salaryRange.currency || 'INR'}
                        </span>
                      </div>
                    )}
                  </div>

                  {job.mustHaveSkills && job.mustHaveSkills.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {job.mustHaveSkills.slice(0, 3).map((skill, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] px-2 py-0.5 rounded-md bg-slate-50 text-slate-700 border border-slate-200"
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

                {/* Footer bar */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{applicants} Applicants</span>
                  </div>

                  <span className="text-teal-700 font-bold group-hover:underline inline-flex items-center gap-1">
                    Manage &rarr;
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <PostJobChoiceModal
        isOpen={postModalOpen}
        onClose={() => setPostModalOpen(false)}
      />
    </div>
  );
};
