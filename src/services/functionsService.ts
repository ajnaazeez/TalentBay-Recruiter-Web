import { httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { functions } from '@/lib/firebase';

/**
 * Cloud Functions Service
 * Connects to verified Cloud Functions on talent-bay-d0b92 in us-central1.
 * Only verified client-callable functions required by the Recruiter App:
 * 1. generateJobDescription
 * 2. deleteUserAccount
 */

export interface GenerateJobDescriptionParams {
  role?: string;
  title?: string;
  department?: string;
  skills: string[];
  experienceLevel?: string;
  experience?: string;
}


export interface GenerateJobDescriptionResult {
  description: string;
  responsibilities?: string[];
  requirements?: string[];
}

export const functionsService = {
  /**
   * Verified Cloud Function: generateJobDescription (us-central1)
   * Generates AI-assisted job description, responsibilities, and requirements.
   */
  async generateJobDescription(
    params: GenerateJobDescriptionParams
  ): Promise<GenerateJobDescriptionResult> {
    try {
      const fn = httpsCallable<Record<string, unknown>, GenerateJobDescriptionResult>(
        functions,
        'generateJobDescription'
      );
      const payload = {
        role: params.role || params.title || '',
        department: params.department || '',
        skills: params.skills || [],
        experienceLevel: params.experienceLevel || '',
      };
      const result: HttpsCallableResult<GenerateJobDescriptionResult> = await fn(payload);
      return result.data;
    } catch (err) {
      console.error('[functionsService.generateJobDescription] Error calling function:', err);
      throw err;
    }
  },

  /**
   * Verified Cloud Function: deleteUserAccount (us-central1)
   * Securely purges user, recruiter, posted jobs, applications, chats, messages, notifications, and auth.
   */
  async deleteUserAccount(): Promise<{ success: boolean; message?: string }> {
    try {
      const fn = httpsCallable<Record<string, unknown>, { success: boolean; message?: string }>(
        functions,
        'deleteUserAccount'
      );
      const result = await fn({});
      if (!result?.data?.success) {
        throw new Error(result?.data?.message || 'Server failed to delete account.');
      }
      return result.data;
    } catch (err) {
      console.error('[functionsService.deleteUserAccount] Error calling function:', err);
      throw err;
    }
  },

  /**
   * Cloud Function: createRazorpayOrder (us-central1)
   * Securely creates an order with Razorpay server-side.
   */
  async createRazorpayOrder(params: {
    planId: string;
    amountPaise: number;
    currency?: string;
  }): Promise<{ orderId: string; id?: string; amount?: number; currency?: string }> {
    try {
      const fn = httpsCallable<
        { planId: string; amount?: number; currency?: string },
        { orderId: string; id?: string; amount?: number; currency?: string }
      >(functions, 'createRazorpayOrder');
      const result = await fn({
        planId: params.planId,
        amount: params.amountPaise,
        currency: params.currency || 'INR',
      });
      const orderId = result.data?.orderId || result.data?.id;
      if (!orderId) {
        throw new Error('Payment gateway did not return a valid order ID.');
      }
      return {
        orderId,
        id: orderId,
        amount: result.data?.amount,
        currency: result.data?.currency,
      };
    } catch (err: unknown) {
      console.error('[functionsService.createRazorpayOrder] Cloud Function error:', err);
      throw err;
    }
  },

  /**
   * Cloud Function: verifyRazorpayPayment (us-central1)
   * Securely verifies HMAC-SHA256 signature server-side, validates payment capture, and activates subscription via Admin SDK.
   * Supports both (paymentId + orderId + signature) and (orderId only for active polling / reconciliation).
   */
  async verifyRazorpayPayment(params: {
    paymentId?: string | null;
    orderId?: string | null;
    signature?: string | null;
    planId: string;
  }): Promise<{
    success: boolean;
    verified: boolean;
    pending?: boolean;
    failed?: boolean;
    alreadyProcessed?: boolean;
    expiryDate?: string;
    paymentId?: string;
    message?: string;
  }> {
    try {
      const fn = httpsCallable<
        { paymentId?: string | null; orderId?: string | null; signature?: string | null; planId: string },
        {
          success: boolean;
          verified: boolean;
          pending?: boolean;
          failed?: boolean;
          alreadyProcessed?: boolean;
          expiryDate?: string;
          paymentId?: string;
          message?: string;
        }
      >(functions, 'verifyRazorpayPayment');
      const result = await fn(params);
      return result.data;
    } catch (err: unknown) {
      console.error('[functionsService.verifyRazorpayPayment] Cloud Function error:', err);
      throw err;
    }
  },

  /**
   * Cloud Function: syncRecruiterPhoneAuth (us-central1)
   * Resolves, links, and provisions the authenticated Phone UID to the active recruiter profile server-side.
   */
  async syncRecruiterPhoneAuth(params?: { phoneNumber?: string }): Promise<{
    success: boolean;
    linked?: boolean;
    companyId?: string;
    fullName?: string;
    officialEmail?: string;
  }> {
    try {
      const fn = httpsCallable<
        { phoneNumber?: string },
        { success: boolean; linked?: boolean; companyId?: string; fullName?: string; officialEmail?: string }
      >(functions, 'syncRecruiterPhoneAuth');
      const result = await fn(params || {});
      return result.data;
    } catch (err: unknown) {
      console.warn('[functionsService.syncRecruiterPhoneAuth] Notice calling syncRecruiterPhoneAuth:', err);
      return { success: false };
    }
  },

  /**
   * Cloud Function: validateRecruiterRegistration (us-central1)
   * Validates uniqueness of phone number and email against active recruiter and candidate accounts.
   * Fails closed if the validation Cloud Function encounters an error or is unreachable.
   */
  async validateRecruiterRegistration(params: {
    email?: string;
    phoneNumber?: string;
    excludeUid?: string;
  }): Promise<{
    phoneExists: boolean;
    emailExists: boolean;
    isCandidate?: boolean;
    valid: boolean;
    message?: string;
  }> {
    try {
      const fn = httpsCallable<
        { email?: string; phoneNumber?: string; excludeUid?: string },
        { phoneExists: boolean; emailExists: boolean; isCandidate?: boolean; valid: boolean; message?: string }
      >(functions, 'validateRecruiterRegistration');
      const result = await fn(params);
      if (!result?.data) {
        throw new Error('Verification service returned an empty response. Please try again.');
      }
      return result.data;
    } catch (err: unknown) {
      console.error('[functionsService.validateRecruiterRegistration] Error calling Cloud Function:', err);
      throw err;
    }
  },

  /**
   * Cloud Function: checkRecruiterPhoneForSignIn (us-central1)
   * Authoritatively checks if a phone number belongs to an active recruiter account before sending OTP.
   */
  async checkRecruiterPhoneForSignIn(phoneNumber: string): Promise<{
    exists: boolean;
    message?: string;
  }> {
    try {
      const fn = httpsCallable<
        { phoneNumber: string },
        { exists: boolean; message?: string }
      >(functions, 'checkRecruiterPhoneForSignIn');
      const result = await fn({ phoneNumber });
      return result.data || { exists: false, message: 'No recruiter account found with this mobile number. Please create an account first.' };
    } catch (err: unknown) {
      console.warn('[functionsService.checkRecruiterPhoneForSignIn] Notice calling function:', err);
      return { exists: false, message: 'Unable to verify account status. Please try again.' };
    }
  },
};

