import { createContext } from 'react';
import { ConfirmationResult, User } from 'firebase/auth';
import { RecruiterProfile, Company } from '@/types';
import { SignUpRecruiterParams } from '@/services/authService';

export interface AuthContextType {
  user: User | null;
  recruiterProfile: RecruiterProfile | null;
  companyProfile: Company | null;
  loading: boolean;
  initialLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isSubscribed: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signInWithPhoneOtp: (confirmationResult: ConfirmationResult, otp: string) => Promise<User>;
  signUp: (params: SignUpRecruiterParams) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateRecruiter: (data: Partial<RecruiterProfile>) => Promise<void>;
  updateCompany: (data: Partial<Company>) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
