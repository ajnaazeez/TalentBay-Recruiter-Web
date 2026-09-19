import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  User,
  Briefcase,
  GraduationCap,
  FolderGit2,
  FileText,
  MapPin,
  Mail,
  Phone,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  Building,
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { candidateService } from '@/services/candidateService';
import { applicationService } from '@/services/applicationService';
import { chatService } from '@/services/chatService';
import { jobService } from '@/services/jobService';
import { aiEvaluationService } from '@/services/aiEvaluationService';
import { CandidateModel } from '@/types/candidate';
import { JobApplicationModel } from '@/types/application';
import { JobModel } from '@/types/job';
import { ROUTES } from '@/utils/constants';
import { formatDate } from '@/utils/formatters';

interface CandidateNavState {
  candidate?: CandidateModel;
  application?: JobApplicationModel;
  job?: JobModel;
}

export const CandidateDetailPage: React.FC = () => {
  const { candidateId } = useParams<{ candidateId: string }>();

  const location = useLocation();
  const navigate = useNavigate();
  const { user, isSubscribed } = useAuth();
  const navState = location.state as CandidateNavState | null;

  const [candidate, setCandidate] = useState<CandidateModel | null>(
    navState?.candidate || null
  );
  const [application, setApplication] = useState<JobApplicationModel | null>(
    navState?.application || null
  );
  const [job, setJob] = useState<JobModel | null>(
    navState?.job || null
  );

  const [loading, setLoading] = useState(!candidate);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'experience' | 'education' | 'projects' | 'resume'>('profile');

  useEffect(() => {
    const loadData = async () => {
      if (!candidateId) return;
      try {
        setLoading(true);
        // Fetch candidate if not already in state
        if (!candidate) {
          const fetchedCandidate = await candidateService.getCandidateById(candidateId);
          setCandidate(fetchedCandidate);
        }

        // If jobId passed in query or state, load job and application
        const searchParams = new URLSearchParams(location.search);
        const queryJobId = searchParams.get('jobId') || job?.jobId;
        if (queryJobId) {
          if (!job) {
            const fetchedJob = await jobService.getJobById(queryJobId);
            setJob(fetchedJob);
          }
          if (!application) {
            const appId = `${queryJobId}_${candidateId}`;
            const fetchedApp = await applicationService.getApplicationById(appId);
            setApplication(fetchedApp);
          }
        }
      } catch (err: unknown) {
        console.error('Error loading candidate details:', err);
        setError('Failed to load candidate details.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [candidateId, location.search, candidate, job, application]);


  // Status update action handler matching Flutter _updateStatus
  const handleUpdateStatus = async (newStatus: 'shortlisted' | 'rejected' | 'hired') => {
    if (!isSubscribed) {
      navigate(ROUTES.SUBSCRIPTION);
      return;
    }
    if (!application || !candidate) return;

    try {
      setActionLoading(true);
      setError(null);
      await applicationService.updateApplicationStatus(application.applicationId, newStatus);

      // Clean up chat for rejected or hired if needed
      if (['rejected', 'hired'].includes(newStatus) && job && user) {
        try {
          const chatId = await chatService.getOrCreateChat({
            jobId: job.jobId,
            candidateId: candidate.uid,
            recruiterId: job.recruiterId || user.uid,
          });
          await chatService.deleteChat(chatId);
        } catch (e) {
          console.warn('Non-critical: chat deletion cleanup', e);
        }
      }

      // Compute and save AI score if not yet evaluated
      if (job && application.aiMatchScore === undefined) {
        const evalResult = aiEvaluationService.evaluate(candidate, job);
        await applicationService.saveAiRecommendation(
          application.applicationId,
          evalResult.score,
          evalResult.reason
        );
      }


      setApplication((prev) => (prev ? { ...prev, applicationStatus: newStatus } : null));
    } catch (err: unknown) {
      console.error('Error updating candidate status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update candidate status.');
    } finally {
      setActionLoading(false);
    }
  };

  // Chat launcher matching Flutter _openChat
  const handleOpenChat = async () => {
    if (!isSubscribed) {
      navigate(ROUTES.SUBSCRIPTION);
      return;
    }
    if (!candidate || !user) return;

    try {
      setActionLoading(true);
      const targetJobId = job?.jobId || application?.jobId || 'direct';
      const chatId = await chatService.getOrCreateChat({
        jobId: targetJobId,
        candidateId: candidate.uid,
        recruiterId: user.uid,
      });

      navigate(ROUTES.CHAT, {
        state: {
          activeChatId: chatId,
          candidateId: candidate.uid,
          candidateName: candidate.fullName,
          jobTitle: job?.roleName || 'Recruitment Opportunity',
        },
      });
    } catch (err: unknown) {
      console.error('Error opening chat:', err);
      setError(err instanceof Error ? err.message : 'Failed to open message conversation.');
    } finally {
      setActionLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400">
        <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-medium">Loading candidate profile...</p>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="bg-white rounded-2xl p-12 border border-slate-200/90 text-center shadow-xs">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-4">
          <User className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Candidate Profile Not Found</h3>
        <p className="text-xs text-slate-500 mt-1">
          This candidate profile could not be located in the TalentBay database.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="mt-6 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
        >
          <ChevronLeft className="w-4 h-4" /> Go Back
        </button>
      </div>
    );
  }

  const status = application?.applicationStatus;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Breadcrumb / Nav */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Candidates</span>
        </button>

        {job && (
          <span className="text-xs text-slate-500 font-medium">
            Applied for: <strong className="text-slate-800">{job.roleName}</strong>
          </span>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Main Candidate Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4 sm:gap-5">
            {/* Avatar */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-teal-700 to-slate-800 text-white font-bold text-2xl flex items-center justify-center shrink-0 ring-4 ring-slate-50 shadow-sm overflow-hidden">
              {candidate.profileImageUrl ? (
                <img
                  src={candidate.profileImageUrl}
                  alt={candidate.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                candidate.fullName.charAt(0).toUpperCase()
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {candidate.fullName}
                </h1>
                {status && (
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                      status === 'shortlisted'
                        ? 'bg-teal-50 text-teal-700 border-teal-200'
                        : status === 'hired'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : status === 'rejected'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : status === 'invited'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                  >
                    {status}
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm font-semibold text-slate-600">
                {candidate.headline || candidate.jobPreferences?.roles?.[0] || 'Software Professional'}
              </p>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 pt-1">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {typeof candidate.location === 'object' && candidate.location !== null
                      ? (candidate.location as { city?: string }).city || 'India'
                      : candidate.location || 'India'}
                  </span>
                </div>

                {candidate.email && (

                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{candidate.email}</span>
                  </div>
                )}
                {candidate.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{candidate.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Button Bar */}
          <div className="flex items-center flex-wrap gap-2.5 w-full md:w-auto">
            {/* Status-dependent buttons */}
            {status === 'applied' && (
              <>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleUpdateStatus('rejected')}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Reject
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleUpdateStatus('shortlisted')}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-black rounded-xl transition shadow-xs disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Shortlist
                </button>
              </>
            )}

            {status === 'shortlisted' && (
              <>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleUpdateStatus('rejected')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" /> Reject
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleOpenChat}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition disabled:opacity-50"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Message
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleUpdateStatus('hired')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Hire
                </button>
              </>
            )}

            {(status === 'invited' || status === 'accepted' || !status) && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleOpenChat}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-xl transition shadow-xs disabled:opacity-50"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Message Candidate
              </button>
            )}
          </div>
        </div>

        {/* AI Match Recommendation Box (if available) */}
        {application?.aiMatchScore !== undefined && application.aiMatchScore !== null && (
          <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-teal-50/80 to-blue-50/80 border border-teal-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                {application.aiMatchScore}%
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                  AI Candidate Match Evaluation
                </h4>
                <p className="text-xs text-slate-600 mt-0.5 max-w-xl">
                  {application.aiReason || 'AI analysis evaluated candidate skill profiles against job requirements.'}
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-teal-800 px-2.5 py-1 rounded-lg bg-teal-100/60 shrink-0">
              {application.aiMatchScore >= 70 ? 'Strong Fit' : application.aiMatchScore >= 40 ? 'Moderate Fit' : 'Low Match'}
            </span>
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto scrollbar-none">
        {[
          { key: 'profile' as const, label: 'Overview & Skills', icon: User },
          { key: 'experience' as const, label: `Experience (${candidate.experience?.length || 0})`, icon: Briefcase },
          { key: 'education' as const, label: `Education (${candidate.education?.length || 0})`, icon: GraduationCap },
          { key: 'projects' as const, label: `Projects (${candidate.projects?.length || 0})`, icon: FolderGit2 },
          { key: 'resume' as const, label: 'Resume & Documents', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                isActive
                  ? 'border-teal-600 text-teal-700 bg-teal-50/40 rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Profile & Skills Overview */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* About / Summary */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Professional Summary
              </h3>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-normal">
                {candidate.about || candidate.summary || 'No professional summary provided.'}
              </p>
            </div>

            {/* Skills */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Technical & Core Skills
              </h3>
              {candidate.skills && candidate.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {candidate.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No skills listed.</p>
              )}
            </div>

            {/* Languages */}
            {Array.isArray(candidate.languages) && candidate.languages.length > 0 && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Languages Spoken
                </h3>
                <div className="flex flex-wrap gap-2">
                  {candidate.languages.map((lang: unknown, idx: number) => {
                    const langObj = typeof lang === 'object' && lang !== null ? (lang as { language?: string; proficiency?: string }) : null;
                    return (
                      <span
                        key={idx}
                        className="px-3 py-1 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg"
                      >
                        {typeof lang === 'string' ? lang : `${langObj?.language || ''} (${langObj?.proficiency || 'Proficient'})`}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Preferences Column */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Job Preferences
              </h3>

              <div className="space-y-3 text-xs text-slate-600">
                <div>
                  <span className="text-slate-400 block mb-0.5">Target Roles</span>
                  <p className="font-semibold text-slate-800">
                    {candidate.jobPreferences?.roles?.join(', ') || 'Not specified'}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400 block mb-0.5">Preferred Locations</span>
                  <p className="font-semibold text-slate-800">
                    {candidate.jobPreferences?.preferredLocations?.join(', ') || 'Flexible'}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400 block mb-0.5">Work Modes</span>
                  <p className="font-semibold text-slate-800">
                    {candidate.jobPreferences?.workModes?.join(', ') || 'Any Mode'}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400 block mb-0.5">Employment Types</span>
                  <p className="font-semibold text-slate-800">
                    {candidate.jobPreferences?.jobTypes?.join(', ') || 'Full-time'}
                  </p>
                </div>

                {candidate.jobPreferences?.expectedSalary && (
                  <div>
                    <span className="text-slate-400 block mb-0.5">Expected CTC</span>
                    <p className="font-semibold text-emerald-700">
                      {typeof candidate.jobPreferences.expectedSalary === 'object' && candidate.jobPreferences.expectedSalary !== null
                        ? `₹${((candidate.jobPreferences.expectedSalary as { min?: number }).min || 0).toLocaleString()} - ₹${((candidate.jobPreferences.expectedSalary as { max?: number }).max || 0).toLocaleString()} LPA`
                        : String(candidate.jobPreferences.expectedSalary)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Experience */}
      {activeTab === 'experience' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Work Experience History
          </h3>

          {(!candidate.workExperience || candidate.workExperience.length === 0) && (!Array.isArray(candidate.workHistory) || candidate.workHistory.length === 0) ? (
            <p className="text-xs text-slate-400 py-6">No work experience entries recorded.</p>
          ) : (
            <div className="space-y-6 divide-y divide-slate-100">
              {(candidate.workExperience || (candidate.workHistory as import('@/types').CandidateWorkExperience[]) || []).map((exp, idx) => (
                <div key={idx} className={`${idx > 0 ? 'pt-6' : ''} space-y-2`}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <h4 className="text-sm font-bold text-slate-900">
                      {exp.jobTitle || exp.title}
                    </h4>
                    <span className="text-xs font-medium text-slate-500">
                      {exp.startDate ? formatDate(exp.startDate) : 'Start'} — {exp.isCurrent ? 'Present' : exp.endDate ? formatDate(exp.endDate) : 'End'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    <span>{exp.companyName || exp.company}</span>
                    {exp.location && <span>• {exp.location}</span>}
                  </div>
                  {exp.description && (
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap pt-1">
                      {exp.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}


      {/* Tab 3: Education */}
      {activeTab === 'education' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Academic Background
          </h3>

          {!candidate.education || candidate.education.length === 0 ? (
            <p className="text-xs text-slate-400 py-6">No education history recorded.</p>
          ) : (
            <div className="space-y-6 divide-y divide-slate-100">
              {candidate.education.map((edu, idx) => (
                <div key={idx} className={`${idx > 0 ? 'pt-6' : ''} space-y-1.5`}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <h4 className="text-sm font-bold text-slate-900">
                      {edu.degree} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ''}
                    </h4>
                    <span className="text-xs font-medium text-slate-500">
                      {edu.startYear || ''} {edu.endYear ? `— ${edu.endYear}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                    <span>{edu.institution || edu.school}</span>
                  </div>
                  {edu.grade && (
                    <p className="text-xs text-slate-500 font-medium">
                      Grade / CGPA: <strong className="text-slate-800">{edu.grade}</strong>
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Projects */}
      {activeTab === 'projects' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Key Projects
          </h3>

          {!candidate.projects || candidate.projects.length === 0 ? (
            <p className="text-xs text-slate-400 py-6">No project entries listed.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {candidate.projects.map((proj, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-900">{proj.title || proj.name}</h4>
                      {proj.link && (
                        <a
                          href={proj.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-teal-600 hover:text-teal-700"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                    {proj.description && (
                      <p className="text-xs text-slate-600 line-clamp-3">{proj.description}</p>
                    )}
                  </div>
                  {proj.technologies && proj.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-2">
                      {proj.technologies.map((t: string, i: number) => (
                        <span
                          key={i}
                          className="text-[10px] px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Resume & Documents */}
      {activeTab === 'resume' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Resume & Uploaded Documents
          </h3>

          {candidate.resumeUrl ? (
            <div className="p-5 rounded-2xl bg-teal-50/50 border border-teal-200/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {candidate.fullName}'s Official Resume
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Original candidate document attached to profile
                  </p>
                </div>
              </div>

              <a
                href={candidate.resumeUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-black rounded-xl transition shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View / Download Resume
              </a>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-medium">No resume document attached.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
