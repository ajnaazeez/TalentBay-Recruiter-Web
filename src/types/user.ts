export type UserRole = 'recruiter' | 'candidate' | 'admin';

export type UserStatus = 'active' | 'pending_verification' | 'suspended' | 'deleted';

export interface UserBase {
  uid: string;
  email: string | null;
  phoneNumber?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  userType: 'recruiter' | 'candidate' | 'admin';
  role?: UserRole;
  isPhoneVerified?: boolean;
  isEmailVerified?: boolean;
  status?: UserStatus;
  createdAt: unknown;
  updatedAt?: unknown;
}
