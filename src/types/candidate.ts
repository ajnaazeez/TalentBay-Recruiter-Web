export interface CandidateAddress {
  city: string;
  country: string;
  state?: string;
}

export interface CandidateJobPreference {
  preferredRoles?: string[];
  preferredLocations?: string[];
  preferredIndustry?: string;
  expectedSalary?: { min?: number; max?: number } | string;
  roles?: string[];
  workModes?: string[];
  jobTypes?: string[];
}

export interface CandidateWorkExperience {
  jobTitle?: string;
  companyName?: string;
  title?: string;
  company?: string;
  role?: string;
  location?: string;
  startDate?: unknown;
  endDate?: unknown;
  isCurrent?: boolean;
  description?: string;
}

export type CandidateExperience = CandidateWorkExperience;

export interface CandidateEducation {
  school?: string;
  institution?: string;
  degree?: string;
  fieldOfStudy?: string;
  startYear?: string | number;
  endYear?: string | number;
  year?: string;
  grade?: string;
  startDate?: unknown;
  endDate?: unknown;
}

export interface CandidateProject {
  title?: string;
  name?: string;
  description?: string;
  technologies?: string[];
  link?: string;
}

export interface CandidateCertification {
  name: string;
  issuingOrganization: string;
  issueDate: unknown;
  credentialUrl?: string;
}

export interface Candidate {
  id: string; // Document ID / uid
  uid: string;
  email: string;
  fullName: string;
  name: string;
  candidateId?: string;
  userId?: string;
  phoneNumber?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  profileImageUrl?: string;
  avatar?: string;
  avatarUrl?: string;
  bio?: string;
  about?: string;
  aboutMe?: string;
  summary?: string;
  headline?: string;
  role?: string;
  dob?: unknown;
  gender?: string;
  nationality?: string;
  willingToRelocate?: boolean;
  currentLocation?: CandidateAddress | string;
  location?: CandidateAddress | string;
  jobPreference?: CandidateJobPreference;
  jobPreferences?: CandidateJobPreference;
  skills: string[];
  workExperience?: CandidateWorkExperience[];
  workHistory?: CandidateWorkExperience[];
  experience?: CandidateWorkExperience[] | string;
  currentCompany?: string;
  company?: string;
  totalExperienceYears?: number | string;
  education: CandidateEducation[];
  projects: CandidateProject[];
  certifications: CandidateCertification[];
  portfolioLinks?: string[];
  resumeUrl?: string;
  portfolioUrl?: string;
  githubProfile?: string;
  linkedinProfile?: string;
  otherLinks?: string[];
  languages?: Array<{ language: string; proficiency?: string }> | string[] | Record<string, string>;
  achievements?: string;
  profileCompletionPercentage?: number;
  isProfilePublic?: boolean;
  accountStatus?: string;
  status?: string;
  expectedCtc?: string | number;
  expectedSalary?: string;
  noticePeriod?: string;
  appliedJob?: string;
  createdAt?: unknown;
  lastUpdated?: unknown;
  updatedAt?: unknown;

  // Recruiter Match helpers
  matchScore?: number;
  calculatedMatch?: number;
  matchReason?: string;
  matchedJobId?: string;
  matchedJobTitle?: string;
}

export type CandidateModel = Candidate;
