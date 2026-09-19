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
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/utils/constants';
import { JobApplication, ApplicationStatus, Job } from '@/types';
import { candidateService } from './candidateService';
import { aiEvaluationService } from './aiEvaluationService';

function parseRawApplication(docId: string, data: Record<string, unknown>): {
  applicationId: string;
  jobId: string;
  candidateId: string;
  applicationStatus: ApplicationStatus;
  appliedAt: unknown;
  resumeUrl?: string;
  coverLetter?: string;
  source?: string;
  aiMatchScore?: number;
  aiMatchReason?: string;
  companyId?: string;
  recruiterId?: string;
  jobTitle?: string;
} {
  return {
    applicationId: (data.applicationId as string) || docId,
    jobId: (data.jobId as string) || '',
    candidateId: (data.candidateId as string) || '',
    applicationStatus: ((data.applicationStatus as string) || (data.stage as string) || 'applied').toLowerCase() as ApplicationStatus,
    appliedAt: data.appliedAt || data.createdAt,
    resumeUrl: (data.resumeUrl as string) || '',
    coverLetter: (data.coverLetter as string) || '',
    source: (data.source as string) || 'job_portal',
    aiMatchScore: (data.aiMatchScore as number) ?? (data.matchScore as number),
    aiMatchReason: (data.aiMatchReason as string) ?? (data.matchReason as string),
    companyId: (data.companyId as string) || '',
    recruiterId: (data.recruiterId as string) || '',
    jobTitle: (data.jobTitle as string) || '',
  };
}

export const applicationService = {
  /**
   * Realtime stream of applications for a specific job opening.
   * Matches Flutter JobRepository.getApplicationsStream(jobId).
   */
  subscribeToJobApplications(
    jobId: string,
    callback: (applications: JobApplication[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const appsRef = collection(db, COLLECTIONS.JOB_APPLICATIONS);
    const q = query(
      appsRef,
      where('jobId', '==', jobId),
      orderBy('appliedAt', 'desc')
    );

    return onSnapshot(
      q,
      async (snapshot) => {
        const rawApps = snapshot.docs.map((d) => parseRawApplication(d.id, d.data()));
        const candidateIds = rawApps.map((a) => a.candidateId).filter(Boolean);
        const candidateMap = await candidateService.getCandidatesByIds(candidateIds);

        const applications: JobApplication[] = rawApps.map((raw) => {
          const candidate = candidateMap.get(raw.candidateId);
          const candidateName = candidate?.fullName || candidate?.name || 'Candidate';
          const stage = raw.applicationStatus || 'applied';

          const candLoc =
            typeof candidate?.currentLocation === 'object' && candidate?.currentLocation !== null
              ? candidate.currentLocation.city
              : typeof candidate?.location === 'string'
              ? candidate.location
              : typeof candidate?.currentLocation === 'string'
              ? candidate.currentLocation
              : 'India';

          return {
            id: raw.applicationId,
            applicationId: raw.applicationId,
            jobId: raw.jobId,
            jobTitle: raw.jobTitle || '',
            companyId: raw.companyId || '',
            recruiterId: raw.recruiterId || '',
            candidateId: raw.candidateId,
            candidateName,
            candidateAvatarUrl: candidate?.photoUrl || candidate?.avatarUrl || '',
            candidateAvatar: candidate?.avatar || candidateName.charAt(0).toUpperCase(),
            candidateEmail: candidate?.email || '',
            candidatePhone: candidate?.phoneNumber || candidate?.phone || '',
            experience: typeof candidate?.experience === 'string' ? candidate.experience : '2+ yrs',
            location: candLoc,
            aiMatchScore: raw.aiMatchScore ?? candidate?.matchScore ?? 85,
            aiMatchReason: raw.aiMatchReason || candidate?.matchReason || '',
            aiReason: raw.aiMatchReason || candidate?.matchReason || '',
            matchScore: raw.aiMatchScore ?? candidate?.matchScore ?? 85,
            matchReason: raw.aiMatchReason || candidate?.matchReason || '',
            applicationStatus: stage,
            stage,
            resumeUrl: raw.resumeUrl || candidate?.resumeUrl || '',
            coverLetter: raw.coverLetter || '',
            appliedAt: raw.appliedAt,
            createdAt: raw.appliedAt,
          };
        });

        callback(applications);
      },
      (error) => {
        console.error('[applicationService.subscribeToJobApplications] Error:', error);
        if (onError) onError(error);
      }
    );
  },

  /**
   * Realtime stream of applications for a company.
   */
  subscribeToCompanyApplications(
    companyId: string,
    callback: (applications: JobApplication[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const appsRef = collection(db, COLLECTIONS.JOB_APPLICATIONS);
    const q = query(
      appsRef,
      where('companyId', '==', companyId)
    );

    return onSnapshot(
      q,
      async (snapshot) => {
        const rawApps = snapshot.docs.map((d) => parseRawApplication(d.id, d.data()));
        const candidateIds = rawApps.map((a) => a.candidateId).filter(Boolean);
        const candidateMap = await candidateService.getCandidatesByIds(candidateIds);

        const applications: JobApplication[] = rawApps.map((raw) => {
          const candidate = candidateMap.get(raw.candidateId);
          const candidateName = candidate?.fullName || candidate?.name || 'Candidate';
          const stage = raw.applicationStatus || 'applied';

          const candLoc =
            typeof candidate?.currentLocation === 'object' && candidate?.currentLocation !== null
              ? candidate.currentLocation.city
              : typeof candidate?.location === 'string'
              ? candidate.location
              : typeof candidate?.currentLocation === 'string'
              ? candidate.currentLocation
              : 'India';

          return {
            id: raw.applicationId,
            applicationId: raw.applicationId,
            jobId: raw.jobId,
            jobTitle: raw.jobTitle || 'Role Opening',
            companyId: raw.companyId || companyId,
            recruiterId: raw.recruiterId || '',
            candidateId: raw.candidateId,
            candidateName,
            candidateAvatarUrl: candidate?.photoUrl || candidate?.avatarUrl || '',
            candidateAvatar: candidate?.avatar || candidateName.charAt(0).toUpperCase(),
            candidateEmail: candidate?.email || '',
            candidatePhone: candidate?.phoneNumber || candidate?.phone || '',
            experience: typeof candidate?.experience === 'string' ? candidate.experience : '2+ yrs',
            location: candLoc,
            aiMatchScore: raw.aiMatchScore ?? candidate?.matchScore ?? 85,
            aiMatchReason: raw.aiMatchReason || candidate?.matchReason || '',
            aiReason: raw.aiMatchReason || candidate?.matchReason || '',
            matchScore: raw.aiMatchScore ?? candidate?.matchScore ?? 85,
            matchReason: raw.aiMatchReason || candidate?.matchReason || '',
            applicationStatus: stage,
            stage,
            resumeUrl: raw.resumeUrl || candidate?.resumeUrl || '',
            coverLetter: raw.coverLetter || '',
            appliedAt: raw.appliedAt,
            createdAt: raw.appliedAt,
          };
        });

        callback(applications);
      },
      (error) => {
        console.error('[applicationService.subscribeToCompanyApplications] Error:', error);
        if (onError) onError(error);
      }
    );
  },

  /**
   * Fetches applications for a company.
   */
  async getApplicationsByCompanyId(companyId: string): Promise<JobApplication[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.JOB_APPLICATIONS),
        where('companyId', '==', companyId)
      );
      const snap = await getDocs(q);
      const rawApps = snap.docs.map((d) => parseRawApplication(d.id, d.data()));
      const candidateIds = rawApps.map((a) => a.candidateId).filter(Boolean);
      const candidateMap = await candidateService.getCandidatesByIds(candidateIds);

      return rawApps.map((raw) => {
        const candidate = candidateMap.get(raw.candidateId);
        const candidateName = candidate?.fullName || candidate?.name || 'Candidate';
        const stage = raw.applicationStatus || 'applied';

        const candLoc =
          typeof candidate?.currentLocation === 'object' && candidate?.currentLocation !== null
            ? candidate.currentLocation.city
            : typeof candidate?.location === 'string'
            ? candidate.location
            : typeof candidate?.currentLocation === 'string'
            ? candidate.currentLocation
            : 'India';

        return {
          id: raw.applicationId,
          applicationId: raw.applicationId,
          jobId: raw.jobId,
          jobTitle: raw.jobTitle || 'Role Opening',
          companyId: raw.companyId || companyId,
          recruiterId: raw.recruiterId || '',
          candidateId: raw.candidateId,
          candidateName,
          candidateAvatarUrl: candidate?.photoUrl || candidate?.avatarUrl || '',
          candidateAvatar: candidate?.avatar || candidateName.charAt(0).toUpperCase(),
          candidateEmail: candidate?.email || '',
          candidatePhone: candidate?.phoneNumber || candidate?.phone || '',
          experience: typeof candidate?.experience === 'string' ? candidate.experience : '2+ yrs',
          location: candLoc,
          aiMatchScore: raw.aiMatchScore ?? candidate?.matchScore ?? 85,
          aiMatchReason: raw.aiMatchReason || candidate?.matchReason || '',
          aiReason: raw.aiMatchReason || candidate?.matchReason || '',
          matchScore: raw.aiMatchScore ?? candidate?.matchScore ?? 85,
          matchReason: raw.aiMatchReason || candidate?.matchReason || '',
          applicationStatus: stage,
          stage,
          resumeUrl: raw.resumeUrl || candidate?.resumeUrl || '',
          coverLetter: raw.coverLetter || '',
          appliedAt: raw.appliedAt,
          createdAt: raw.appliedAt,
        };
      });
    } catch (err) {
      console.warn('[applicationService.getApplicationsByCompanyId] Error:', err);
      return [];
    }
  },

  /**
   * Fetches applications for a list of job IDs.
   * Joins candidate documents and evaluates AI match scores.
   */
  async getApplicationsForJobs(
    jobs: Job[]
  ): Promise<JobApplication[]> {
    if (!jobs || jobs.length === 0) return [];

    const jobIds = jobs.map((j) => j.id || j.jobId).filter(Boolean);
    const jobMap = new Map<string, Job>(jobs.map((j) => [j.id || j.jobId, j]));

    const rawApps: ReturnType<typeof parseRawApplication>[] = [];

    // Query in chunks of 10 for whereIn
    for (let i = 0; i < jobIds.length; i += 10) {
      const chunk = jobIds.slice(i, i + 10);
      try {
        const q = query(
          collection(db, COLLECTIONS.JOB_APPLICATIONS),
          where('jobId', 'in', chunk)
        );
        const snap = await getDocs(q);
        snap.docs.forEach((d) => {
          rawApps.push(parseRawApplication(d.id, d.data()));
        });
      } catch (err) {
        console.warn('[applicationService.getApplicationsForJobs] Chunk query error:', err);
      }
    }

    if (rawApps.length === 0) return [];

    // Fetch candidate profiles for these applications
    const candidateIds = rawApps.map((a) => a.candidateId).filter(Boolean);
    const candidateMap = await candidateService.getCandidatesByIds(candidateIds);

    const result: JobApplication[] = [];

    for (const raw of rawApps) {
      const job = jobMap.get(raw.jobId);
      const candidate = candidateMap.get(raw.candidateId);
      const candidateName = candidate?.fullName || candidate?.name || 'Candidate';
      const stage = raw.applicationStatus || 'applied';

      let matchScore = raw.aiMatchScore;
      let matchReason = raw.aiMatchReason;

      if (matchScore === undefined && candidate && job) {
        const rec = aiEvaluationService.evaluate(candidate, job);
        matchScore = rec.score;
        matchReason = rec.reason;
      }

      const candLoc =
        typeof candidate?.currentLocation === 'object' && candidate?.currentLocation !== null
          ? candidate.currentLocation.city
          : typeof candidate?.location === 'string'
          ? candidate.location
          : typeof candidate?.currentLocation === 'string'
          ? candidate.currentLocation
          : 'India';

      result.push({
        id: raw.applicationId,
        applicationId: raw.applicationId,
        jobId: raw.jobId,
        jobTitle: job?.roleName || job?.title || 'Job Opening',
        companyId: job?.companyId || '',
        recruiterId: job?.recruiterId || '',
        candidateId: raw.candidateId,
        candidateName,
        candidateAvatarUrl: candidate?.photoUrl || candidate?.avatarUrl || '',
        candidateAvatar: candidate?.avatar || candidateName.charAt(0).toUpperCase(),
        candidateEmail: candidate?.email || '',
        candidatePhone: candidate?.phoneNumber || candidate?.phone || '',
        experience: typeof candidate?.experience === 'string' ? candidate.experience : '2+ yrs',
        location: candLoc,
        aiMatchScore: matchScore ?? 85,
        aiMatchReason: matchReason || 'Matched role qualifications',
        aiReason: matchReason || 'Matched role qualifications',
        matchScore: matchScore ?? 85,
        matchReason: matchReason || 'Matched role qualifications',
        applicationStatus: stage,
        stage,
        resumeUrl: raw.resumeUrl || candidate?.resumeUrl || '',
        coverLetter: raw.coverLetter || '',
        appliedAt: raw.appliedAt,
        createdAt: raw.appliedAt,
      });
    }

    // Sort descending by appliedAt
    result.sort((a, b) => {
      const tA = (a.appliedAt as { toMillis?: () => number })?.toMillis?.() || 0;
      const tB = (b.appliedAt as { toMillis?: () => number })?.toMillis?.() || 0;
      return tB - tA;
    });

    return result;
  },

  /**
   * Helper to delete chat and messages when a candidate is rejected or hired.
   */
  async deleteAssociatedChat(jobId: string, candidateId: string): Promise<void> {
    try {
      const chatsRef = collection(db, COLLECTIONS.CHATS);
      const q = query(
        chatsRef,
        where('jobId', '==', jobId),
        where('candidateId', '==', candidateId)
      );
      const snap = await getDocs(q);
      for (const chatDoc of snap.docs) {
        // Delete messages subcollection
        const msgsQuery = query(collection(db, COLLECTIONS.CHATS, chatDoc.id, COLLECTIONS.MESSAGES));
        const msgSnaps = await getDocs(msgsQuery);
        if (!msgSnaps.empty) {
          const batch = writeBatch(db);
          msgSnaps.docs.forEach((m) => batch.delete(m.ref));
          await batch.commit();
        }
        await deleteDoc(chatDoc.ref);
      }
    } catch (err) {
      console.warn('[applicationService.deleteAssociatedChat] Non-fatal cleanup error:', err);
    }
  },

  /**
   * Updates application status to: 'applied' | 'invited' | 'screening' | 'interviewing' | 'shortlisted' | 'hired' | 'rejected' | 'accepted'.
   * When status is 'hired' or 'rejected', automatically triggers chat cleanup matching Flutter.
   */
  async updateApplicationStage(
    applicationId: string,
    status: ApplicationStatus
  ): Promise<void> {
    const docRef = doc(db, COLLECTIONS.JOB_APPLICATIONS, applicationId);
    const snap = await getDoc(docRef);

    await updateDoc(docRef, {
      stage: status,
      applicationStatus: status,
      updatedAt: serverTimestamp(),
    });

    if ((status === 'hired' || status === 'rejected') && snap.exists()) {
      const data = snap.data();
      if (data.jobId && data.candidateId) {
        await this.deleteAssociatedChat(data.jobId, data.candidateId);
      }
    }
  },

  // Alias matching Flutter repo
  async updateApplicationStatus(
    applicationId: string,
    status: ApplicationStatus
  ): Promise<void> {
    return this.updateApplicationStage(applicationId, status);
  },

  /**
   * Save AI Recommendation score & reason.
   */
  async saveAiRecommendation(
    applicationId: string,
    score: number,
    reason: string
  ): Promise<void> {
    const docRef = doc(db, COLLECTIONS.JOB_APPLICATIONS, applicationId);
    await updateDoc(docRef, {
      aiMatchScore: score,
      aiMatchReason: reason,
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Invites candidate from Candidate Connect.
   * Document ID format matches Flutter: `${jobId}_${candidateId}`.
   */
  async inviteCandidate(jobId: string, candidateId: string): Promise<string> {
    const docId = `${jobId}_${candidateId}`;
    const docRef = doc(db, COLLECTIONS.JOB_APPLICATIONS, docId);

    const docSnapshot = await getDoc(docRef);
    if (docSnapshot.exists()) {
      throw new Error('Candidate has already applied or been invited to this role.');
    }

    await setDoc(docRef, {
      applicationId: docId,
      jobId,
      candidateId,
      resumeUrl: '',
      coverLetter: '',
      applicationStatus: 'invited',
      appliedAt: serverTimestamp(),
      source: 'recruiter_invite',
    });

    return docId;
  },

  /**
   * Retrieves single application by ID.
   */
  async getApplicationById(applicationId: string): Promise<JobApplication | null> {
    const docRef = doc(db, COLLECTIONS.JOB_APPLICATIONS, applicationId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const raw = parseRawApplication(snap.id, snap.data());
      const candidate = await candidateService.getCandidateById(raw.candidateId);
      const candidateName = candidate?.fullName || candidate?.name || 'Candidate';
      const stage = raw.applicationStatus || 'applied';

      const candLoc =
        typeof candidate?.currentLocation === 'object' && candidate?.currentLocation !== null
          ? candidate.currentLocation.city
          : typeof candidate?.location === 'string'
          ? candidate.location
          : typeof candidate?.currentLocation === 'string'
          ? candidate.currentLocation
          : 'India';

      return {
        id: raw.applicationId,
        applicationId: raw.applicationId,
        jobId: raw.jobId,
        jobTitle: raw.jobTitle || 'Role Opening',
        companyId: raw.companyId || '',
        recruiterId: raw.recruiterId || '',
        candidateId: raw.candidateId,
        candidateName,
        candidateAvatarUrl: candidate?.photoUrl || candidate?.avatarUrl || '',
        candidateAvatar: candidate?.avatar || candidateName.charAt(0).toUpperCase(),
        candidateEmail: candidate?.email || '',
        candidatePhone: candidate?.phoneNumber || candidate?.phone || '',
        experience: typeof candidate?.experience === 'string' ? candidate.experience : '2+ yrs',
        location: candLoc,
        aiMatchScore: raw.aiMatchScore ?? candidate?.matchScore ?? 85,
        aiMatchReason: raw.aiMatchReason || candidate?.matchReason || '',
        aiReason: raw.aiMatchReason || candidate?.matchReason || '',
        matchScore: raw.aiMatchScore ?? candidate?.matchScore ?? 85,
        matchReason: raw.aiMatchReason || candidate?.matchReason || '',
        applicationStatus: stage,
        stage,
        resumeUrl: raw.resumeUrl || candidate?.resumeUrl || '',
        coverLetter: raw.coverLetter || '',
        appliedAt: raw.appliedAt,
        createdAt: raw.appliedAt,
      };
    }
    return null;
  },
};
