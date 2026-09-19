export type JobStatus = 'active' | 'closed' | 'draft';

export type JobType = 'Full-Time' | 'Part-Time' | 'Contract' | 'Internship' | 'Freelance' | string;

export type WorkplaceType = 'Onsite' | 'Remote' | 'Hybrid' | string;

export interface JobLocation {
  city: string;
  state: string;
  country: string;
}

export interface JobExperienceRequired {
  minYears: number;
  maxYears: number;
}

export interface JobSalary {
  min: number;
  max: number;
  currency: string;
  type: string; // 'CTC', 'Monthly', 'Hourly'
}

export interface Job {
  id: string; // Document ID (usually equals jobId)
  jobId: string;
  companyId: string;
  recruiterId: string;
  roleId?: string;
  roleName: string;
  designationId?: string;
  designationName: string;
  experienceLevel?: string;
  employmentType: string;
  workMode: string;
  jobLocation: JobLocation;
  vacancies: number;
  officeCount?: number;
  experienceRequired: JobExperienceRequired;
  salary: JobSalary;
  salaryRange?: { min: number; max: number; currency?: string };
  skillsRequired: string[];
  mustHaveSkills: string[];
  niceToHaveSkills: string[];
  jobDescription: string;
  responsibilities: string[];
  requirements: string[];
  interviewProcess: string[];
  extraQuestions?: string[];
  status: JobStatus;
  visibility: 'public' | 'private' | string;
  postedAt: unknown;
  expiresAt: unknown;
  title?: string;
  department?: string;
  companyName?: string;
  companyLogoUrl?: string;
  educationalQualification?: string;
  salaryPeriod?: string;
  salaryCurrency?: string;

  // Compatibility aliases
  location?: string | JobLocation;
  description?: string;
  skills?: string[];
  minSalary?: number;
  maxSalary?: number;
  minExperienceYears?: number;
  maxExperienceYears?: number;
  urgentHiring?: boolean;
  applicantCount?: number;
  applicantsCount?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
  closedAt?: unknown;
}


export type JobModel = Job;
