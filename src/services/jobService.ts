import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  Timestamp,
  Unsubscribe,
  UpdateData,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { COLLECTIONS } from '@/utils/constants';
import { Job, JobStatus, JobLocation, JobExperienceRequired, JobSalary } from '@/types';

function parseLocation(data: Record<string, unknown>): JobLocation {
  if (typeof data.jobLocation === 'object' && data.jobLocation !== null) {
    const loc = data.jobLocation as { city?: string; state?: string; country?: string };
    return {
      city: loc.city || 'Bangalore',
      state: loc.state || 'Karnataka',
      country: loc.country || 'India',
    };
  }
  if (typeof data.location === 'string' && data.location.trim()) {
    const parts = data.location.split(',').map((s) => s.trim());
    return {
      city: parts[0] || 'Bangalore',
      state: parts[1] || 'Karnataka',
      country: parts[2] || 'India',
    };
  }
  return {
    city: 'Bangalore',
    state: 'Karnataka',
    country: 'India',
  };
}

function parseSalary(data: Record<string, unknown>): JobSalary {
  if (typeof data.salary === 'object' && data.salary !== null) {
    const sal = data.salary as { min?: number | string; max?: number | string; currency?: string; type?: string };
    return {
      min: Number(sal.min) || 0,
      max: Number(sal.max) || 0,
      currency: sal.currency || 'INR',
      type: sal.type || 'CTC',
    };
  }
  const min = data.minSalary !== undefined ? Number(data.minSalary) || 0 : 0;
  const max = data.maxSalary !== undefined ? Number(data.maxSalary) || 0 : 0;
  return {
    min,
    max,
    currency: 'INR',
    type: 'CTC',
  };
}

function parseExperience(data: Record<string, unknown>): JobExperienceRequired {
  if (typeof data.experienceRequired === 'object' && data.experienceRequired !== null) {
    const exp = data.experienceRequired as { minYears?: number; maxYears?: number };
    return {
      minYears: Number(exp.minYears) || 0,
      maxYears: Number(exp.maxYears) || 0,
    };
  }
  const min = data.minExperienceYears !== undefined ? Number(data.minExperienceYears) || 0 : 0;
  const max = data.maxExperienceYears !== undefined ? Number(data.maxExperienceYears) || 0 : 0;
  return {
    minYears: min,
    maxYears: max,
  };
}

function mapDocToJob(docId: string, data: Record<string, unknown>, companyIdFallback?: string): Job {
  const skills = Array.isArray(data.skillsRequired)
    ? data.skillsRequired
    : Array.isArray(data.skills)
    ? data.skills
    : [];

  const mustHaveSkills = Array.isArray(data.mustHaveSkills) ? data.mustHaveSkills : [];
  const niceToHaveSkills = Array.isArray(data.niceToHaveSkills) ? data.niceToHaveSkills : [];

  const responsibilities = Array.isArray(data.responsibilities)
    ? data.responsibilities
    : typeof data.responsibilities === 'string'
    ? data.responsibilities.split('\n').filter(Boolean)
    : [];

  const requirements = Array.isArray(data.requirements)
    ? data.requirements
    : typeof data.requirements === 'string'
    ? data.requirements.split('\n').filter(Boolean)
    : [];

  const interviewProcess = Array.isArray(data.interviewProcess) ? data.interviewProcess : [];
  const extraQuestions = Array.isArray(data.extraQuestions) ? data.extraQuestions : [];

  const jobLocation = parseLocation(data);
  const salary = parseSalary(data);
  const experienceRequired = parseExperience(data);

  const title = (data.roleName as string) || (data.title as string) || 'Untitled Role';
  const roleName = (data.roleName as string) || title;
  const designationName = (data.designationName as string) || title;
  const locationString = `${jobLocation.city}, ${jobLocation.state}, ${jobLocation.country}`;

  return {
    id: docId,
    jobId: (data.jobId as string) || docId,
    companyId: (data.companyId as string) || companyIdFallback || '',
    companyName: (data.companyName as string) || '',
    companyLogoUrl: (data.companyLogoUrl as string) || '',
    recruiterId: (data.recruiterId as string) || '',
    title,
    roleName,
    roleId: (data.roleId as string) || 'custom',
    designationId: (data.designationId as string) || 'custom',
    designationName,
    experienceLevel: (data.experienceLevel as string) || (experienceRequired.minYears > 0 ? 'Experienced' : 'Fresher'),
    employmentType: (data.employmentType as string) || 'Full-Time',
    workMode: (data.workMode as string) || 'Hybrid',
    jobLocation,
    vacancies: (data.vacancies as number) ?? 1,
    officeCount: (data.officeCount as number) ?? 0,
    experienceRequired,
    salary,
    skillsRequired: skills,
    mustHaveSkills,
    niceToHaveSkills,
    jobDescription: (data.jobDescription as string) || (data.description as string) || '',
    responsibilities,
    requirements,
    interviewProcess,
    extraQuestions,
    status: ((data.status as string)?.toLowerCase() as JobStatus) || 'active',
    visibility: (data.visibility as string) || 'public',
    postedAt: data.postedAt || data.createdAt,
    expiresAt: data.expiresAt,
    createdAt: data.createdAt || data.postedAt,
    updatedAt: data.updatedAt,
    closedAt: data.closedAt,

    // Convenience aliases
    department: (data.department as string) || 'Engineering',
    location: locationString,
    minSalary: salary.min,
    maxSalary: salary.max,
    minExperienceYears: experienceRequired.minYears,
    maxExperienceYears: experienceRequired.maxYears,
    description: (data.jobDescription as string) || (data.description as string) || '',
    skills,
    applicantCount: (data.applicantCount as number) ?? 0,
    applicantsCount: (data.applicantCount as number) ?? 0,
  };
}

export interface JobService {
  subscribeToCompanyJobs(
    companyId: string | null | undefined,
    callback: (jobs: Job[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe;
  subscribeToCompanyJobs(
    companyId: string | null | undefined,
    recruiterId: string | null | undefined,
    callback: (jobs: Job[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe;
  getCompanyJobs(companyId?: string | null, recruiterId?: string | null): Promise<Job[]>;
  getJobById(jobId: string): Promise<Job | null>;
  createJob(jobData: Partial<Job>): Promise<string>;

  updateJob(jobId: string, updates: Partial<Job>): Promise<void>;
  closeJob(jobId: string): Promise<void>;
  repostJob(originalJobId: string, newVacancies?: number): Promise<string>;
  deleteJob(jobId: string): Promise<void>;
}

export const jobService: JobService = {
  subscribeToCompanyJobs(
    companyId: string | null | undefined,
    callbackOrRecruiterId: ((jobs: Job[]) => void) | string | null | undefined,
    callbackOrOnError?: ((jobs: Job[]) => void) | ((error: Error) => void),
    maybeOnError?: (error: Error) => void
  ): Unsubscribe {
    let recruiterId: string | null = null;
    let callback: (jobs: Job[]) => void;
    let onError: ((error: Error) => void) | undefined;

    if (typeof callbackOrRecruiterId === 'function') {
      callback = callbackOrRecruiterId;
      onError = callbackOrOnError as ((error: Error) => void) | undefined;
    } else {
      recruiterId = callbackOrRecruiterId ? String(callbackOrRecruiterId).trim() : null;
      callback = callbackOrOnError as (jobs: Job[]) => void;
      onError = maybeOnError;
    }

    const cleanCompanyId = companyId ? String(companyId).trim() : '';
    const cleanRecruiterId = recruiterId ? String(recruiterId).trim() : '';

    const jobsRef = collection(db, COLLECTIONS.JOBS);
    let unsubPrimary: Unsubscribe = () => {};
    let unsubFallback: Unsubscribe = () => {};

    const jobsMap = new Map<string, Job>();

    const emitMergedJobs = () => {
      const allJobs = Array.from(jobsMap.values());
      // Sort descending by postedAt
      allJobs.sort((a, b) => {
        const tA = (a.postedAt as { toMillis?: () => number })?.toMillis?.() ||
          (a.postedAt instanceof Date ? a.postedAt.getTime() : 0);
        const tB = (b.postedAt as { toMillis?: () => number })?.toMillis?.() ||
          (b.postedAt instanceof Date ? b.postedAt.getTime() : 0);
        return tB - tA;
      });
      callback(allJobs);
    };

    if (cleanCompanyId) {
      try {
        const qCompany = query(
          jobsRef,
          where('companyId', '==', cleanCompanyId),
          orderBy('postedAt', 'desc')
        );
        unsubPrimary = onSnapshot(
          qCompany,
          (snapshot) => {
            snapshot.docs.forEach((docSnap) => {
              jobsMap.set(docSnap.id, mapDocToJob(docSnap.id, docSnap.data(), cleanCompanyId));
            });
            emitMergedJobs();
          },
          (err) => {
            console.warn('[jobService.subscribeToCompanyJobs] Ordered query failed, falling back to unordered:', err);
            // Fallback without orderBy
            const qFallback = query(jobsRef, where('companyId', '==', cleanCompanyId));
            unsubPrimary = onSnapshot(qFallback, (snapshot) => {
              snapshot.docs.forEach((docSnap) => {
                jobsMap.set(docSnap.id, mapDocToJob(docSnap.id, docSnap.data(), cleanCompanyId));
              });
              emitMergedJobs();
            }, (fallbackErr) => {
              console.error('[jobService.subscribeToCompanyJobs] Company query error:', fallbackErr);
              if (onError) onError(fallbackErr);
            });
          }
        );
      } catch (err) {
        console.error('[jobService.subscribeToCompanyJobs] Setup error:', err);
      }
    }

    if (cleanRecruiterId) {
      try {
        // Query by recruiterId without orderBy to avoid missing index error
        const qRecruiter = query(
          jobsRef,
          where('recruiterId', '==', cleanRecruiterId)
        );
        unsubFallback = onSnapshot(
          qRecruiter,
          (snapshot) => {
            snapshot.docs.forEach((docSnap) => {
              jobsMap.set(docSnap.id, mapDocToJob(docSnap.id, docSnap.data(), cleanCompanyId));
            });
            emitMergedJobs();
          },
          (err) => {
            console.warn('[jobService.subscribeToCompanyJobs] RecruiterId query error:', err);
          }
        );
      } catch (err) {
        console.warn('[jobService.subscribeToCompanyJobs] Recruiter listener setup error:', err);
      }
    }

    // If neither was provided, emit empty list
    if (!cleanCompanyId && !cleanRecruiterId) {
      callback([]);
    }

    return () => {
      unsubPrimary();
      unsubFallback();
    };
  },

  /**
   * One-time fetch of all jobs for a company and/or recruiter.
   */
  async getCompanyJobs(
    companyId?: string | null,
    recruiterId?: string | null
  ): Promise<Job[]> {
    const cleanCompanyId = companyId ? String(companyId).trim() : '';
    const cleanRecruiterId = recruiterId ? String(recruiterId).trim() : '';

    const jobsRef = collection(db, COLLECTIONS.JOBS);
    const jobsMap = new Map<string, Job>();

    if (cleanCompanyId) {
      try {
        const q = query(
          jobsRef,
          where('companyId', '==', cleanCompanyId),
          orderBy('postedAt', 'desc')
        );
        const snapshot = await getDocs(q);
        snapshot.docs.forEach((docSnap) => {
          jobsMap.set(docSnap.id, mapDocToJob(docSnap.id, docSnap.data(), cleanCompanyId));
        });
      } catch (e) {
        console.warn('[jobService.getCompanyJobs] Ordered query error, retrying without orderBy:', e);
        try {
          const qNoOrder = query(jobsRef, where('companyId', '==', cleanCompanyId));
          const snapshot = await getDocs(qNoOrder);
          snapshot.docs.forEach((docSnap) => {
            jobsMap.set(docSnap.id, mapDocToJob(docSnap.id, docSnap.data(), cleanCompanyId));
          });
        } catch (e2) {
          console.error('[jobService.getCompanyJobs] Company fetch error:', e2);
        }
      }
    }

    if (cleanRecruiterId) {
      try {
        const qRecruiter = query(jobsRef, where('recruiterId', '==', cleanRecruiterId));
        const snapshot = await getDocs(qRecruiter);
        snapshot.docs.forEach((docSnap) => {
          jobsMap.set(docSnap.id, mapDocToJob(docSnap.id, docSnap.data(), cleanCompanyId));
        });
      } catch (e) {
        console.warn('[jobService.getCompanyJobs] Recruiter fetch error:', e);
      }
    }

    const allJobs = Array.from(jobsMap.values());
    allJobs.sort((a, b) => {
      const tA = (a.postedAt as { toMillis?: () => number })?.toMillis?.() ||
        (a.postedAt instanceof Date ? a.postedAt.getTime() : 0);
      const tB = (b.postedAt as { toMillis?: () => number })?.toMillis?.() ||
        (b.postedAt instanceof Date ? b.postedAt.getTime() : 0);
      return tB - tA;
    });

    return allJobs;
  },

  /**
   * Retrieves single job posting by ID.
   */
  async getJobById(jobId: string): Promise<Job | null> {
    const docRef = doc(db, COLLECTIONS.JOBS, jobId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return mapDocToJob(snap.id, snap.data());
    }
    return null;
  },

  /**
   * Creates a new job posting in /jobs.
   * Schema matches Flutter JobModel.toMap() precisely.
   */
  async createJob(jobData: Partial<Job>): Promise<string> {
    const newDocRef = doc(collection(db, COLLECTIONS.JOBS));
    const now = new Date();

    const expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const skills = jobData.skillsRequired || jobData.skills || [];
    const title = jobData.roleName || jobData.title || 'Untitled Role';

    const city = jobData.jobLocation?.city || 'Bangalore';
    const state = jobData.jobLocation?.state || 'Karnataka';
    const country = jobData.jobLocation?.country || 'India';

    const minSal = jobData.salary?.min ?? (typeof jobData.minSalary === 'number' ? jobData.minSalary : 0);
    const maxSal = jobData.salary?.max ?? (typeof jobData.maxSalary === 'number' ? jobData.maxSalary : 0);

    const minExp = jobData.experienceRequired?.minYears ?? (typeof jobData.minExperienceYears === 'number' ? jobData.minExperienceYears : 0);
    const maxExp = jobData.experienceRequired?.maxYears ?? (typeof jobData.maxExperienceYears === 'number' ? jobData.maxExperienceYears : (minExp > 0 ? minExp + 2 : 0));

    const responsibilities = Array.isArray(jobData.responsibilities)
      ? jobData.responsibilities
      : typeof jobData.responsibilities === 'string'
      ? (jobData.responsibilities as string).split('\n').filter(Boolean)
      : [];

    const requirements = Array.isArray(jobData.requirements)
      ? jobData.requirements
      : typeof jobData.requirements === 'string'
      ? (jobData.requirements as string).split('\n').filter(Boolean)
      : [];

    const payload = {
      jobId: newDocRef.id,
      companyId: jobData.companyId,
      recruiterId: jobData.recruiterId,
      roleId: jobData.roleId || 'custom',
      roleName: title,
      designationId: jobData.designationId || 'custom',
      designationName: jobData.designationName || title,
      experienceLevel: minExp > 0 ? 'Experienced' : 'Fresher',
      employmentType: jobData.employmentType || 'Full-Time',
      workMode: jobData.workMode || 'Hybrid',
      jobLocation: {
        city,
        state,
        country,
      },
      vacancies: jobData.vacancies ?? 1,
      officeCount: jobData.officeCount ?? 0,
      experienceRequired: {
        minYears: minExp,
        maxYears: maxExp,
      },
      salary: {
        min: minSal,
        max: maxSal,
        currency: jobData.salary?.currency || 'INR',
        type: jobData.salary?.type || 'CTC',
      },
      skillsRequired: skills,
      mustHaveSkills: jobData.mustHaveSkills || [],
      niceToHaveSkills: jobData.niceToHaveSkills || [],
      jobDescription: jobData.jobDescription || jobData.description || '',
      responsibilities,
      requirements,
      interviewProcess: jobData.interviewProcess || [],
      extraQuestions: jobData.extraQuestions || [],
      status: jobData.status || 'active',
      visibility: jobData.visibility || 'public',
      postedAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(expiryDate),
      companyName: jobData.companyName || '',
      companyLogoUrl: jobData.companyLogoUrl || '',
      title,
      department: jobData.department || 'Engineering',
      location: `${city}, ${country}`,
    };

    await setDoc(newDocRef, payload);
    return newDocRef.id;
  },

  /**
   * Updates an existing job posting.
   */
  async updateJob(jobId: string, updates: Partial<Job>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.JOBS, jobId);
    const payload: Record<string, unknown> = {
      ...updates,
      updatedAt: serverTimestamp(),
    };
    if (updates.skills) {
      payload.skillsRequired = updates.skills;
    }
    if (updates.title) {
      payload.roleName = updates.title;
      payload.designationName = updates.title;
    }
    await updateDoc(docRef, payload as unknown as UpdateData<Record<string, unknown>>);
  },

  /**
   * Verified Flutter Close Job behavior:
   * 1. Updates job status = 'closed', closedAt = now, expiresAt = now
   * 2. Safely attempts optional cleanup of job applications/chats if permitted
   */
  async closeJob(jobId: string): Promise<void> {
    // 1. Update job status to closed first (primary operation)
    const docRef = doc(db, COLLECTIONS.JOBS, jobId);
    await updateDoc(docRef, {
      status: 'closed',
      closedAt: serverTimestamp(),
      expiresAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 2. Safe cleanup of associated applications (if permitted by security rules)
    try {
      const appsQuery = query(
        collection(db, COLLECTIONS.JOB_APPLICATIONS),
        where('jobId', '==', jobId)
      );
      const appSnaps = await getDocs(appsQuery);
      if (!appSnaps.empty) {
        const batch = writeBatch(db);
        appSnaps.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    } catch (err) {
      console.warn('[jobService.closeJob] Non-fatal application cleanup notice:', err);
    }

    // 3. Safe cleanup of associated chats (if permitted by security rules)
    try {
      const currentUid = auth.currentUser?.uid;
      const chatsRef = collection(db, COLLECTIONS.CHATS);
      const chatsQuery = currentUid
        ? query(chatsRef, where('jobId', '==', jobId), where('recruiterId', '==', currentUid))
        : query(chatsRef, where('jobId', '==', jobId));
      const chatSnaps = await getDocs(chatsQuery);
      for (const chatDoc of chatSnaps.docs) {
        try {
          const msgsQuery = query(collection(db, COLLECTIONS.CHATS, chatDoc.id, COLLECTIONS.MESSAGES));
          const msgSnaps = await getDocs(msgsQuery);
          if (!msgSnaps.empty) {
            const msgBatch = writeBatch(db);
            msgSnaps.docs.forEach((m) => msgBatch.delete(m.ref));
            await msgBatch.commit();
          }
          await deleteDoc(chatDoc.ref);
        } catch (chatErr) {
          console.warn('[jobService.closeJob] Non-fatal chat thread cleanup notice:', chatErr);
        }
      }
    } catch (err) {
      console.warn('[jobService.closeJob] Non-fatal chat cleanup notice:', err);
    }
  },

  /**
   * Verified Flutter Repost Job behavior:
   * 1. Generates a BRAND NEW job document ID
   * 2. Copies previous job configuration
   * 3. Applies newly entered vacancies
   * 4. Sets status = 'active'
   * 5. Sets postedAt = now, expiresAt = now + 30 days
   */
  async repostJob(originalJobId: string, newVacancies: number = 1): Promise<string> {
    const originalJob = await this.getJobById(originalJobId);
    if (!originalJob) throw new Error('Original job opening not found.');

    const newDocRef = doc(collection(db, COLLECTIONS.JOBS));
    const now = new Date();
    const expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const skills = originalJob.skillsRequired || originalJob.skills || [];
    const vacancies = newVacancies > 0 ? newVacancies : (originalJob.vacancies || 1);

    const city = originalJob.jobLocation?.city || 'Bangalore';
    const state = originalJob.jobLocation?.state || 'Karnataka';
    const country = originalJob.jobLocation?.country || 'India';

    const minSal = originalJob.salary?.min ?? originalJob.minSalary ?? 0;
    const maxSal = originalJob.salary?.max ?? originalJob.maxSalary ?? 0;

    const minExp = originalJob.experienceRequired?.minYears ?? originalJob.minExperienceYears ?? 0;
    const maxExp = originalJob.experienceRequired?.maxYears ?? originalJob.maxExperienceYears ?? 0;

    const responsibilities = Array.isArray(originalJob.responsibilities)
      ? originalJob.responsibilities
      : [];

    const requirements = Array.isArray(originalJob.requirements)
      ? originalJob.requirements
      : [];

    await setDoc(newDocRef, {
      jobId: newDocRef.id,
      companyId: originalJob.companyId,
      recruiterId: originalJob.recruiterId,
      roleId: originalJob.roleId || 'custom',
      roleName: originalJob.roleName || originalJob.title,
      designationId: originalJob.designationId || 'custom',
      designationName: originalJob.designationName || originalJob.title,
      experienceLevel: minExp > 0 ? 'Experienced' : 'Fresher',
      employmentType: originalJob.employmentType || 'Full-Time',
      workMode: originalJob.workMode || 'Hybrid',
      jobLocation: {
        city,
        state,
        country,
      },
      vacancies,
      officeCount: 0,
      experienceRequired: {
        minYears: minExp,
        maxYears: maxExp,
      },
      salary: {
        min: minSal,
        max: maxSal,
        currency: originalJob.salary?.currency || 'INR',
        type: originalJob.salary?.type || 'CTC',
      },
      skillsRequired: skills,
      mustHaveSkills: originalJob.mustHaveSkills || [],
      niceToHaveSkills: originalJob.niceToHaveSkills || [],
      jobDescription: originalJob.jobDescription || originalJob.description || '',
      responsibilities,
      requirements,
      interviewProcess: originalJob.interviewProcess || [],
      extraQuestions: originalJob.extraQuestions || [],
      status: 'active',
      visibility: 'public',
      postedAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(expiryDate),
      companyName: originalJob.companyName || '',
      companyLogoUrl: originalJob.companyLogoUrl || '',
      title: originalJob.title,
      department: originalJob.department || 'Engineering',
      location: `${city}, ${country}`,
    });

    return newDocRef.id;
  },

  /**
   * Deletes a job posting.
   */
  async deleteJob(jobId: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.JOBS, jobId);
    await deleteDoc(docRef);
  },
};
