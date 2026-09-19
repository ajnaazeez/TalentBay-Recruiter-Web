export type ApplicationStatus =
  | 'applied'
  | 'invited'
  | 'screening'
  | 'interviewing'
  | 'shortlisted'
  | 'hired'
  | 'rejected'
  | 'accepted';

export type ApplicationStage = ApplicationStatus;

export interface JobApplication {
  id: string; // Document ID: ${jobId}_${candidateId}
  applicationId: string;
  jobId: string;
  candidateId: string;
  candidateName: string;
  jobTitle: string;
  resumeUrl?: string;
  coverLetter?: string;
  applicationStatus: ApplicationStatus;
  appliedAt: unknown;
  source?: string;
  aiMatchScore?: number;
  aiMatchReason?: string;
  aiReason?: string;

  // Compatibility / Enriched fields
  matchScore?: number;
  matchReason?: string;
  companyId?: string;
  recruiterId?: string;
  candidateAvatarUrl?: string;
  candidateAvatar?: string;
  candidateEmail?: string;
  candidatePhone?: string;
  experience?: string;
  location?: string;
  skills?: string[];
  stage?: ApplicationStatus;
  appliedDate?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type JobApplicationModel = JobApplication;
