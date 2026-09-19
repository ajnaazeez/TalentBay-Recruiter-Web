export interface Recruiter {
  uid: string;
  companyId: string;
  fullName: string;
  designation: string;
  officialEmail: string;
  phoneNumber: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: unknown;
  isSubscribed?: boolean;
  isSubscriptionCancelled?: boolean;
  subscriptionExpiry?: unknown;
  subscriptionPlanId?: string | null;
  subscriptionTier?: string | null;
  razorpaySubscriptionId?: string | null;
  appleSubscriptionId?: string | null;
  fcmToken?: string | null;

  // UI & compatibility aliases
  id?: string;
  displayName?: string;
  profileImageUrl?: string;
  email?: string;
  name?: string;
  phone?: string;
  avatarUrl?: string;
  updatedAt?: unknown;
}

export type RecruiterProfile = Recruiter;
