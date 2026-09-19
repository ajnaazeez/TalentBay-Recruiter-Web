export const APP_CONFIG = {
  appName: 'TalentBay Recruiter',
  appDescription: 'TalentBay Recruiter Platform',
  version: '1.0.18',
  supportEmail: 'support@talentbay.com',
  firebaseProjectId: 'talent-bay-d0b92',
  razorpayKeyId: 'rzp_live_TdPCKnpedQNEW6',
};

export const ROUTES = {
  // Auth
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',

  // Recruiter Dashboard & Management
  DASHBOARD: '/dashboard',
  JOBS: '/jobs',
  JOB_DETAIL: '/jobs/:jobId',
  JOB_CREATE: '/jobs/new',
  JOB_BULK_UPLOAD: '/jobs/bulk-upload',
  JOB_EDIT: '/jobs/:jobId/edit',
  CLOSED_JOBS: '/closed-jobs',
  CANDIDATES: '/candidates', // Candidate Connect
  CANDIDATE_DETAIL: '/candidates/:candidateId',
  APPLICATIONS: '/applications',
  APPLICATION_DETAIL: '/applications/:applicationId',
  CHAT: '/chat',
  NOTIFICATIONS: '/notifications',
  PROFILE: '/profile',
  COMPANY: '/company',
  COMPANY_EDIT: '/company/edit',
  SUBSCRIPTION: '/subscription',
  SETTINGS: '/settings',
  SUPPORT: '/support',
  ABOUT: '/about',
} as const;

/**
 * Verified Firestore Collection Names from TalentBay Recruiter Backend
 */
export const COLLECTIONS = {
  USERS: 'users',
  RECRUITERS: 'recruiters',
  COMPANIES: 'companies',
  JOBS: 'jobs',
  JOB_APPLICATIONS: 'job_applications',
  CANDIDATES: 'candidates',
  CHATS: 'chats',
  MESSAGES: 'messages',
  NOTIFICATIONS: 'notification_recruter',
} as const;

/**
 * Verified Firebase Storage Paths
 */
export const STORAGE_PATHS = {
  companyLogo: (companyId: string) => `companies/${companyId}/logo.jpg`,
  companyBanner: (companyId: string) => `companies/${companyId}/banner.jpg`,
  companyDocument: (companyId: string, docName: string) =>
    `companies/${companyId}/documents/${docName}.pdf`,
  recruiterAvatar: (recruiterId: string) => `recruiters/${recruiterId}/profile.jpg`,
  chatAttachment: (chatId: string, filename: string) =>
    `chat_attachments/${chatId}/${Date.now()}_${filename}`,
};

/**
 * Verified Recruiter Subscription Tiers from TalentBay Mobile App (subscription_config.dart)
 */
export const SUBSCRIPTION_PLANS = [
  {
    id: 'trial_60_days_1_rupee',
    name: 'Trial (60 Days)',
    price: 1,
    amountPaise: 100,
    displayPrice: '₹1',
    period: 'for 60 days',
    durationDays: 60,
    description: 'Introductory trial offer for new recruiter accounts',
    features: [
      'Post active job openings',
      'AI fit score evaluation for applicants',
      'Direct candidate chat messaging',
      'Candidate Connect suggestions',
      'Repost closed jobs',
    ],
  },
  {
    id: 'monthly_1499',
    name: 'Monthly Plan',
    price: 1499,
    amountPaise: 149900,
    displayPrice: '₹1,499',
    period: 'per month (30 days)',
    durationDays: 30,
    description: 'Standard monthly hiring access for recruiters',
    features: [
      'Active job postings',
      'AI candidate fit evaluations',
      'Direct candidate chat messaging',
      'Full Candidate Connect talent access',
      'Realtime applicant notifications',
      'Repost closed jobs',
    ],
  },
  {
    id: 'six_months_8549',
    name: '6 Months Plan',
    price: 8549,
    amountPaise: 854900,
    displayPrice: '₹8,549',
    period: 'for 180 days (5% off)',
    durationDays: 180,
    description: 'Cost-saving plan for growing recruitment teams',
    features: [
      'All Monthly Plan features included',
      '180 days uninterrupted workspace access',
      '5% savings compared to monthly renewal',
      'Candidate Connect talent access',
      'Repost closed jobs',
    ],
  },
  {
    id: 'yearly_17089',
    name: 'Yearly Plan',
    price: 17089,
    amountPaise: 1708900,
    displayPrice: '₹17,089',
    period: 'for 365 days (Best value)',
    durationDays: 365,
    description: 'Maximum savings for continuous year-round recruitment',
    features: [
      'All 6 Months Plan features included',
      '365 days annual workspace access',
      'Maximum cost efficiency for active hiring',
      'Candidate Connect talent access',
      'Repost closed jobs',
    ],
  },
] as const;
