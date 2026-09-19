import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  MapPin,
  Sparkles,
  X,
  ChevronLeft,
  AlertCircle,
  Save,
  CheckCircle2,
  DollarSign,
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { jobService } from '@/services/jobService';
import { functionsService } from '@/services/functionsService';
import { JobModel } from '@/types/job';
import { ROUTES } from '@/utils/constants';

interface JobCreatePageProps {
  isEditing?: boolean;
}

export const JobCreatePage: React.FC<JobCreatePageProps> = ({ isEditing = false }) => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { user, recruiterProfile, companyProfile, isSubscribed } = useAuth();

  // Form State
  const [roleName, setRoleName] = useState('');
  const [designationName, setDesignationName] = useState('');
  const [employmentType, setEmploymentType] = useState('Full-time');
  const [workMode, setWorkMode] = useState('Hybrid');
  const [country, setCountry] = useState('India');
  const [state, setState] = useState('Karnataka');
  const [city, setCity] = useState('Bangalore');
  const [vacancies, setVacancies] = useState<number>(1);
  const [officeCount, setOfficeCount] = useState<number>(1);

  const [minExperience, setMinExperience] = useState<number>(1);
  const [maxExperience, setMaxExperience] = useState<number>(5);

  const [minSalary, setMinSalary] = useState<number>(600000);
  const [maxSalary, setMaxSalary] = useState<number>(1500000);

  const [mustHaveSkills, setMustHaveSkills] = useState<string[]>(['React', 'TypeScript', 'Node.js']);
  const [mustSkillInput, setMustSkillInput] = useState('');

  const [niceToHaveSkills, setNiceToHaveSkills] = useState<string[]>(['GraphQL', 'Docker']);
  const [niceSkillInput, setNiceSkillInput] = useState('');

  const [description, setDescription] = useState('');

  const [loading, setLoading] = useState(Boolean(isEditing && jobId));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // If editing, load the existing job
  useEffect(() => {
    if (isEditing && jobId) {
      const loadJob = async () => {
        try {
          setLoading(true);
          const existingJob = await jobService.getJobById(jobId);
          if (existingJob) {
            setRoleName(existingJob.roleName || existingJob.title || '');
            setDesignationName(existingJob.designationName || '');
            setEmploymentType(existingJob.employmentType || 'Full-time');
            setWorkMode(existingJob.workMode || 'Hybrid');
            setCountry(existingJob.jobLocation?.country || 'India');
            setState(existingJob.jobLocation?.state || '');
            setCity(existingJob.jobLocation?.city || '');
            setVacancies(existingJob.vacancies || 1);
            setOfficeCount(existingJob.officeCount || 1);

            setMinExperience(existingJob.minExperienceYears || existingJob.experienceRequired?.minYears || 0);
            setMaxExperience(existingJob.maxExperienceYears || existingJob.experienceRequired?.maxYears || 5);

            setMinSalary(existingJob.minSalary || existingJob.salary?.min || existingJob.salaryRange?.min || 0);
            setMaxSalary(existingJob.maxSalary || existingJob.salary?.max || existingJob.salaryRange?.max || 0);

            setMustHaveSkills(existingJob.mustHaveSkills || existingJob.skills || []);
            setNiceToHaveSkills(existingJob.niceToHaveSkills || []);
            setDescription(existingJob.jobDescription || existingJob.description || '');
          }
        } catch (err: unknown) {
          console.error('Error loading job for edit:', err);
          setErrorMessage('Failed to load job details.');
        } finally {
          setLoading(false);
        }

      };
      loadJob();
    }
  }, [isEditing, jobId]);

  // Skill Adders
  const handleAddMustSkill = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const val = mustSkillInput.trim();
    if (val && !mustHaveSkills.includes(val)) {
      setMustHaveSkills([...mustHaveSkills, val]);
      setMustSkillInput('');
    }
  };

  const handleAddNiceSkill = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const val = niceSkillInput.trim();
    if (val && !niceToHaveSkills.includes(val)) {
      setNiceToHaveSkills([...niceToHaveSkills, val]);
      setNiceSkillInput('');
    }
  };

  // AI Description Generator matching Flutter Cloud Function
  const handleGenerateAIDescription = async () => {
    if (!roleName.trim()) {
      setErrorMessage('Please enter Role / Title first before generating AI description.');
      return;
    }

    try {
      setIsGeneratingAI(true);
      setErrorMessage(null);
      const res = await functionsService.generateJobDescription({
        role: roleName,
        experience: `${minExperience}-${maxExperience} years`,
        skills: [...mustHaveSkills, ...niceToHaveSkills],
      });

      if (res?.description) {
        let fullDesc = res.description;
        if (res.responsibilities && res.responsibilities.length > 0) {
          fullDesc += '\n\nKey Responsibilities:\n' + res.responsibilities.map((r: string) => `• ${r}`).join('\n');
        }
        if (res.requirements && res.requirements.length > 0) {
          fullDesc += '\n\nRequirements:\n' + res.requirements.map((r: string) => `• ${r}`).join('\n');
        }
        setDescription(fullDesc);
      } else {
        setDescription(
          `We are hiring a ${designationName || roleName} to join our team in ${city}, ${country}. In this role, you will leverage your expertise in ${mustHaveSkills.join(', ')} to build robust solutions, collaborate with cross-functional teams, and drive technical excellence.`
        );
      }
    } catch (err) {
      console.warn('AI generator fallback:', err);
      setDescription(
        `We are hiring a ${designationName || roleName} to join our team in ${city}, ${country}. In this role, you will leverage your expertise in ${mustHaveSkills.join(', ')} to build robust solutions, collaborate with cross-functional teams, and drive technical excellence.`
      );
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) {
      setErrorMessage('Role / Title is required.');
      return;
    }
    if (!description.trim()) {
      setErrorMessage('Job Description is required.');
      return;
    }
    if (mustHaveSkills.length === 0) {
      setErrorMessage('Please add at least one Must-Have Skill.');
      return;
    }

    if (!isSubscribed) {
      navigate(ROUTES.SUBSCRIPTION);
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const companyId = recruiterProfile?.companyId || user?.uid || '';
      const recruiterId = user?.uid || '';
      const companyName = companyProfile?.profile?.companyName || 'TalentBay Recruiter';
      const companyLogoUrl = companyProfile?.profile?.logoUrl || '';

      const jobData: Partial<JobModel> = {
        roleName: roleName.trim(),
        title: roleName.trim(),
        designationName: designationName.trim() || roleName.trim(),
        companyId,
        companyName,
        companyLogoUrl,
        recruiterId,
        employmentType,
        workMode,
        jobLocation: {
          city: city.trim(),
          state: state.trim(),
          country: country.trim(),
        },
        vacancies: Number(vacancies) || 1,
        officeCount: Number(officeCount) || 1,
        minExperienceYears: Number(minExperience) || 0,
        maxExperienceYears: Number(maxExperience) || 0,
        experienceRequired: {
          minYears: Number(minExperience) || 0,
          maxYears: Number(maxExperience) || 0,
        },
        minSalary: Number(minSalary) || 0,
        maxSalary: Number(maxSalary) || 0,
        salaryRange: {
          min: Number(minSalary) || 0,
          max: Number(maxSalary) || 0,
          currency: 'INR',
        },
        salary: {
          min: Number(minSalary) || 0,
          max: Number(maxSalary) || 0,
          currency: 'INR',
          type: 'CTC',
        },
        mustHaveSkills,
        niceToHaveSkills,
        skills: [...mustHaveSkills, ...niceToHaveSkills],
        skillsRequired: mustHaveSkills,
        department: roleName.trim() || 'General',
        jobDescription: description.trim(),

        description: description.trim(),
        status: 'active',
      };

      if (isEditing && jobId) {
        await jobService.updateJob(jobId, jobData);
        setSuccessMessage('Job opening updated successfully!');
        setTimeout(() => navigate(`/jobs/${jobId}`), 1200);
      } else {
        const newJobId = await jobService.createJob(jobData);
        setSuccessMessage('Job opening published successfully!');
        setTimeout(() => navigate(`/jobs/${newJobId}`), 1200);
      }
    } catch (err: unknown) {
      console.error('Error saving job:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save job opening.');
    } finally {
      setIsSubmitting(false);
    }

  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400">
        <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-medium">Loading position details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-teal-50 border border-teal-200/60 flex items-center justify-center text-teal-600 shrink-0">
              <Briefcase className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {isEditing ? 'Edit Job Opening' : 'Post a New Job Opening'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                {isEditing
                  ? 'Update position details and criteria'
                  : 'Define role requirements, skills, and compensation to receive matched candidates'}
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-xl transition shadow-xs disabled:opacity-50 shrink-0"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Saving...' : isEditing ? 'Update Position' : 'Publish Job'}
          </button>
        </div>

        {/* Alerts */}
        {successMessage && (
          <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            {errorMessage}
          </div>
        )}

        {/* Section 1: Role & Designation */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Briefcase className="w-4 h-4 text-teal-600" />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              1. Role & Designation
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Role / Job Title *</label>
              <input
                type="text"
                required
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder="e.g. Flutter Developer"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Designation Name *</label>
              <input
                type="text"
                value={designationName}
                onChange={(e) => setDesignationName(e.target.value)}
                placeholder="e.g. Senior Software Engineer"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Employment Type</label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Work Mode</label>
              <select
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              >
                <option value="Hybrid">Hybrid</option>
                <option value="Remote">Remote</option>
                <option value="Onsite">Onsite</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Location & Vacancies */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <MapPin className="w-4 h-4 text-teal-600" />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              2. Location & Positions
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Bangalore"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">State</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g. Karnataka"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Country</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="India"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Number of Vacancies</label>
              <input
                type="number"
                min="1"
                max="500"
                value={vacancies}
                onChange={(e) => setVacancies(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Office Count</label>
              <input
                type="number"
                min="1"
                max="50"
                value={officeCount}
                onChange={(e) => setOfficeCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Experience & Compensation */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <DollarSign className="w-4 h-4 text-teal-600" />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              3. Experience & Compensation
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Min Experience (Years)</label>
              <input
                type="number"
                min="0"
                max="40"
                value={minExperience}
                onChange={(e) => setMinExperience(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Max Experience (Years)</label>
              <input
                type="number"
                min="0"
                max="40"
                value={maxExperience}
                onChange={(e) => setMaxExperience(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Min Salary (Annual INR)</label>
              <input
                type="number"
                value={minSalary}
                onChange={(e) => setMinSalary(parseInt(e.target.value, 10) || 0)}
                placeholder="600000"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Max Salary (Annual INR)</label>
              <input
                type="number"
                value={maxSalary}
                onChange={(e) => setMaxSalary(parseInt(e.target.value, 10) || 0)}
                placeholder="1500000"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Skills Criteria */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              4. Skill Requirements
            </h2>
          </div>

          {/* Must Have Skills */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700">
              Must-Have Skills * <span className="text-slate-400 font-normal">(Essential for candidate matching)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={mustSkillInput}
                onChange={(e) => setMustSkillInput(e.target.value)}
                onKeyDown={handleAddMustSkill}
                placeholder="e.g. Flutter, React Native, iOS, Android (Press Enter)"
                className="flex-1 px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
              <button
                type="button"
                onClick={handleAddMustSkill}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {mustHaveSkills.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1 text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200/80 rounded-lg flex items-center gap-1.5"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => setMustHaveSkills(mustHaveSkills.filter((s) => s !== skill))}
                    className="text-teal-400 hover:text-teal-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Nice To Have Skills */}
          <div className="space-y-3 pt-2">
            <label className="text-xs font-bold text-slate-700">
              Nice-to-Have Skills <span className="text-slate-400 font-normal">(Optional bonus competencies)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={niceSkillInput}
                onChange={(e) => setNiceSkillInput(e.target.value)}
                onKeyDown={handleAddNiceSkill}
                placeholder="e.g. Firebase, CI/CD, Fastlane (Press Enter)"
                className="flex-1 px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
              <button
                type="button"
                onClick={handleAddNiceSkill}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {niceToHaveSkills.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1 text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 rounded-lg flex items-center gap-1.5"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => setNiceToHaveSkills(niceToHaveSkills.filter((s) => s !== skill))}
                    className="text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Section 5: Description & AI Auto-Generate */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-teal-600" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                5. Job Description
              </h2>
            </div>

            <button
              type="button"
              onClick={handleGenerateAIDescription}
              disabled={isGeneratingAI}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200/70 px-3 py-1.5 rounded-xl transition"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isGeneratingAI ? 'animate-spin' : ''}`} />
              <span>{isGeneratingAI ? 'Generating AI...' : 'Auto-Generate with AI'}</span>
            </button>
          </div>

          <textarea
            rows={7}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed description of responsibilities, project scope, qualifications, and benefits..."
            className="w-full p-4 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 leading-relaxed whitespace-pre-wrap"
          />
        </div>

        {/* Action Button Bar */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-xl transition shadow-xs disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Saving Position...' : isEditing ? 'Update Position' : 'Publish Job Opening'}
          </button>
        </div>
      </form>
    </div>
  );
};
