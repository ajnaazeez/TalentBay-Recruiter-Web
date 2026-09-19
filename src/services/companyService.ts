import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  UpdateData,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { COLLECTIONS, STORAGE_PATHS } from '@/utils/constants';
import { Company } from '@/types';

/**
 * Detects whether a company document contains legacy application-generated defaults
 * ('Technology' or auto-assigned '11-50' inserted during registration) and safely cleans them up
 * in Firestore while preserving all genuine user data.
 */
async function sanitizeLegacyDefaultsIfNeeded(companyId: string, data: Record<string, any>): Promise<void> {
  try {
    const rawInd = data.profile?.industry || data.business?.industry || data.industry || '';
    const rawSize = data.profile?.companySize || data.business?.companySize || data.business?.size || data.companySize || data.size || '';
    
    // Check if industry is the legacy automatic default 'Technology' (not in the edit form dropdown)
    const isLegacyIndustry = typeof rawInd === 'string' && rawInd.trim().toLowerCase() === 'technology';
    
    // Check if company size is the legacy automatic default ('11-50' or '11-50 Employees')
    const isLegacySize = typeof rawSize === 'string' && (rawSize.trim() === '11-50' || rawSize.trim().toLowerCase() === '11-50 employees') && isLegacyIndustry;

    if (isLegacyIndustry || isLegacySize) {
      const docRef = doc(db, COLLECTIONS.COMPANIES, companyId);
      const cleanPayload: Record<string, unknown> = {};

      if (isLegacyIndustry) {
        cleanPayload['profile.industry'] = '';
        cleanPayload['business.industry'] = '';
        cleanPayload['industry'] = '';
      }

      if (isLegacySize) {
        cleanPayload['profile.companySize'] = '';
        cleanPayload['business.companySize'] = '';
        cleanPayload['business.size'] = '';
        cleanPayload['companySize'] = '';
        cleanPayload['size'] = '';
      }

      if (Object.keys(cleanPayload).length > 0) {
        await updateDoc(docRef, cleanPayload as unknown as UpdateData<Record<string, unknown>>);
      }
    }
  } catch (err) {
    console.warn('[companyService] Notice during legacy default sanitization:', err);
  }
}

export const companyService = {
  /**
   * Retrieves company document by ID from /companies/{companyId}.
   * Preserves full 8-map nested structure and cleans legacy automatic defaults.
   */
  async getCompany(companyId: string): Promise<Company | null> {
    try {
      const docRef = doc(db, COLLECTIONS.COMPANIES, companyId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();

        // Check for legacy automatic defaults
        const rawInd = data.profile?.industry || data.business?.industry || data.industry || '';
        const isLegacyIndustry = typeof rawInd === 'string' && rawInd.trim().toLowerCase() === 'technology';
        const rawSize = data.profile?.companySize || data.business?.companySize || data.business?.size || data.companySize || data.size || '';
        const isLegacySize = typeof rawSize === 'string' && (rawSize.trim() === '11-50' || rawSize.trim().toLowerCase() === '11-50 employees') && isLegacyIndustry;

        if (isLegacyIndustry || isLegacySize) {
          // Asynchronously clear legacy defaults from Firestore
          sanitizeLegacyDefaultsIfNeeded(companyId, data);
        }

        const cleanIndustry = isLegacyIndustry ? '' : (typeof rawInd === 'string' ? rawInd.trim() : '');
        const cleanCompanySize = isLegacySize ? '' : (typeof rawSize === 'string' ? rawSize.trim() : '');
        
        const profile = {
          name: data.profile?.companyName || data.profile?.name || data.companyName || data.name || 'Company',
          companyName: data.profile?.companyName || data.profile?.name || data.companyName || data.name || 'Company',
          tagline: data.profile?.tagline || '',
          about: data.profile?.about || data.profile?.description || data.aboutCompany || data.about || '',
          description: data.profile?.description || data.description || '',
          logoUrl: data.profile?.logoUrl || data.logoUrl || '',
          coverImageUrl: data.profile?.coverImageUrl || '',
          bannerUrl: data.profile?.bannerUrl || data.bannerUrl || '',
          industry: cleanIndustry,
          companyType: data.profile?.companyType || data.business?.type || 'Private',
          companySize: cleanCompanySize,
          website: data.profile?.website || data.contact?.website || data.website || '',
          foundedYear: data.profile?.foundedYear || data.business?.foundedYear || data.foundedYear || '',
        };

        const contact = data.contact || {
          email: data.email || '',
          phone: data.phone || '',
          website: profile.website || '',
          city: typeof data.headquarters === 'string' ? data.headquarters : (data.city || ''),
          state: data.state || '',
          country: data.country || 'India',
          locations: data.locations || [],
          primaryAddress: data.primaryAddress,
          additionalOffices: data.additionalOffices || [],
        };

        const business = {
          industry: cleanIndustry,
          size: cleanCompanySize,
          companySize: cleanCompanySize,
          foundedYear: profile.foundedYear,
          type: data.business?.type || 'Private',
          gstNumber: data.business?.gstNumber || data.gstNumber || '',
          registrationNumber: data.business?.registrationNumber || data.registrationNumber || '',
        };

        const verification = data.verification || {
          isVerified: Boolean(data.isVerified),
          status: data.isVerified ? 'verified' : 'pending',
          documents: [],
        };

        const social = data.social || data.socialLinks || {
          linkedin: '',
          twitter: '',
          github: '',
          website: contact.website || '',
        };

        const stats = data.stats || {
          openJobsCount: 0,
          totalHiresCount: 0,
        };

        const settings = data.settings || {
          notifications: true,
        };

        const meta = data.meta || {
          createdBy: data.ownerUid || '',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          isActive: true,
          isBlocked: false,
        };

        return {
          id: snap.id,
          companyId: snap.id,
          profile,
          contact,
          business,
          verification,
          social,
          stats,
          settings,
          meta,
          // Compatibility getters
          name: profile.name,
          companyName: profile.name,
          website: contact.website,
          industry: cleanIndustry,
          companySize: cleanCompanySize,
          size: cleanCompanySize,
          about: profile.about,
          aboutCompany: profile.about,
          logoUrl: profile.logoUrl,
          bannerUrl: profile.bannerUrl,
          isVerified: verification.isVerified,
        };
      }
      return null;
    } catch (err) {
      console.error('[companyService.getCompany] Error:', err);
      throw err;
    }
  },

  /**
   * Updates company profile fields in /companies/{companyId} within nested structure.
   */
  async updateCompany(companyId: string, updates: Partial<Company>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.COMPANIES, companyId);
    
    // Build nested update payload
    const payload: Record<string, unknown> = {
      'meta.updatedAt': serverTimestamp(),
    };

    if (updates.profile) {
      Object.entries(updates.profile).forEach(([k, v]) => {
        if (v !== undefined) payload[`profile.${k}`] = v;
      });
    }
    if (updates.contact) {
      Object.entries(updates.contact).forEach(([k, v]) => {
        if (v !== undefined) payload[`contact.${k}`] = v;
      });
    }
    if (updates.business) {
      Object.entries(updates.business).forEach(([k, v]) => {
        if (v !== undefined) payload[`business.${k}`] = v;
      });
    }
    if (updates.social) {
      Object.entries(updates.social).forEach(([k, v]) => {
        if (v !== undefined) payload[`social.${k}`] = v;
      });
    }
    if (updates.verification) {
      Object.entries(updates.verification).forEach(([k, v]) => {
        if (v !== undefined) payload[`verification.${k}`] = v;
      });
    }
    if (updates.settings) {
      Object.entries(updates.settings).forEach(([k, v]) => {
        if (v !== undefined) payload[`settings.${k}`] = v;
      });
    }

    // Handle root compatibility updates
    if (updates.name) payload['profile.name'] = updates.name;
    if (updates.about) payload['profile.about'] = updates.about;
    if (updates.aboutCompany) payload['profile.about'] = updates.aboutCompany;
    if (updates.website) payload['contact.website'] = updates.website;
    if (updates.industry) payload['business.industry'] = updates.industry;
    if (updates.size) payload['business.size'] = updates.size;
    if (updates.companySize) payload['business.companySize'] = updates.companySize;

    await updateDoc(docRef, payload as unknown as UpdateData<Record<string, unknown>>);
  },

  /**
   * Creates a new company document in /companies with full nested structure.
   */
  async createCompany(companyId: string, data: Company): Promise<void> {
    const docRef = doc(db, COLLECTIONS.COMPANIES, companyId);
    await setDoc(docRef, {
      ...data,
      companyId,
      'meta.createdAt': serverTimestamp(),
      'meta.updatedAt': serverTimestamp(),
    });
  },

  /**
   * Alias for getCompany
   */
  async getCompanyById(companyId: string): Promise<Company | null> {
    return this.getCompany(companyId);
  },

  /**
   * Uploads company logo to verified storage path: companies/{companyId}/logo.jpg
   */
  async uploadLogo(companyId: string, file: File): Promise<string> {
    const storagePath = STORAGE_PATHS.companyLogo(companyId);
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file, { contentType: file.type });
    const downloadUrl = await getDownloadURL(storageRef);

    await updateDoc(doc(db, COLLECTIONS.COMPANIES, companyId), {
      'profile.logoUrl': downloadUrl,
      'meta.updatedAt': serverTimestamp(),
    });

    return downloadUrl;
  },

  /**
   * Alias for uploadLogo
   */
  async uploadCompanyLogo(companyId: string, file: File): Promise<string> {
    return this.uploadLogo(companyId, file);
  },

  /**
   * Uploads company banner to verified storage path: companies/{companyId}/banner.jpg
   */
  async uploadBanner(companyId: string, file: File): Promise<string> {
    const storagePath = STORAGE_PATHS.companyBanner(companyId);
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file, { contentType: file.type });
    const downloadUrl = await getDownloadURL(storageRef);

    await updateDoc(doc(db, COLLECTIONS.COMPANIES, companyId), {
      'profile.bannerUrl': downloadUrl,
      'meta.updatedAt': serverTimestamp(),
    });

    return downloadUrl;
  },

  /**
   * Uploads company document to verified storage path: companies/{companyId}/documents/{docName}.pdf
   */
  async uploadDocument(companyId: string, docName: string, file: File): Promise<string> {
    const storagePath = STORAGE_PATHS.companyDocument(companyId, docName);
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file, { contentType: file.type });
    return getDownloadURL(storageRef);
  },
};

