import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  limit,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/utils/constants';
import { Candidate, CandidateAddress, CandidateWorkExperience, CandidateEducation, CandidateProject, CandidateCertification } from '@/types';

function parseCandidateDoc(docId: string, data: Record<string, unknown>): Candidate {
  const firstName = (data.firstName as string) || '';
  const lastName = (data.lastName as string) || '';
  const computedName = `${firstName} ${lastName}`.trim();
  const fullName = (data.fullName as string) || computedName || (data.name as string) || 'Candidate';

  // Skills: list of strings or list of objects { name: '...' }
  const rawSkills = Array.isArray(data.skills)
    ? data.skills.map((s) => (typeof s === 'object' && s !== null ? (s as { name?: string }).name || '' : String(s))).filter(Boolean)
    : [];

  // Work experience
  const rawWork = Array.isArray(data.workExperience)
    ? data.workExperience
    : Array.isArray(data.workHistory)
    ? data.workHistory
    : [];

  const workExperience: CandidateWorkExperience[] = rawWork.map((w: Record<string, unknown>) => {
    return {
      jobTitle: (w.jobTitle as string) || (w.title as string) || '',
      companyName: (w.companyName as string) || (w.company as string) || '',
      title: (w.jobTitle as string) || (w.title as string) || '',
      company: (w.companyName as string) || (w.company as string) || '',
      startDate: w.startDate ? String(w.startDate) : '',
      endDate: w.endDate ? String(w.endDate) : (w.isCurrent ? 'Present' : ''),
      isCurrent: Boolean(w.isCurrent),
      description: (w.description as string) || '',
    };
  });

  // Calculate total experience years
  let totalExpYears = 0;
  if (typeof data.totalExperienceYears === 'number') {
    totalExpYears = data.totalExperienceYears;
  } else if (rawWork.length > 0) {
    totalExpYears = rawWork.length * 1.5;
  }

  // Education
  const rawEdu = Array.isArray(data.education) ? data.education : [];
  const education: CandidateEducation[] = rawEdu.map((e: Record<string, unknown>) => {
    return {
      school: (e.schoolName as string) || (e.school as string) || (e.institution as string) || '',
      institution: (e.schoolName as string) || (e.school as string) || (e.institution as string) || '',
      degree: (e.degree as string) || '',
      fieldOfStudy: (e.fieldOfStudy as string) || '',
      startDate: e.startDate ? String(e.startDate) : '',
      endDate: e.endDate ? String(e.endDate) : '',
      year: e.endDate ? String(e.endDate) : '',
    };
  });

  // Projects
  const rawProj = Array.isArray(data.projects) ? data.projects : [];
  const projects: CandidateProject[] = rawProj.map((p: Record<string, unknown>) => ({
    title: (p.title as string) || '',
    description: (p.description as string) || '',
    technologies: Array.isArray(p.technologies) ? p.technologies.map(String) : Array.isArray(p.techStack) ? p.techStack.map(String) : [],
    link: (p.link as string) || (p.url as string) || '',
  }));

  // Certifications
  const rawCert = Array.isArray(data.certifications) ? data.certifications : [];
  const certifications: CandidateCertification[] = rawCert.map((c: Record<string, unknown>) => ({
    name: (c.name as string) || '',
    issuingOrganization: (c.issuingOrganization as string) || '',
    issueDate: c.issueDate,
    credentialUrl: (c.credentialUrl as string) || '',
  }));

  // Location
  let locStr = 'India';
  if (typeof data.currentLocation === 'object' && data.currentLocation !== null) {
    const loc = data.currentLocation as { city?: string; state?: string; country?: string };
    locStr = [loc.city, loc.state, loc.country].filter(Boolean).join(', ') || 'India';
  } else if (typeof data.location === 'string' && data.location.trim()) {
    locStr = data.location;
  }

  // Expected salary / Job preference
  let expectedSalary = 'Negotiable';
  if (typeof data.jobPreference === 'object' && data.jobPreference !== null) {
    const jp = data.jobPreference as { expectedSalary?: string; salaryMin?: number; salaryMax?: number; salaryCurrency?: string };
    if (jp.expectedSalary) {
      expectedSalary = jp.expectedSalary;
    } else if (jp.salaryMin || jp.salaryMax) {
      expectedSalary = `${jp.salaryCurrency || 'INR'} ${jp.salaryMin || 0} - ${jp.salaryMax || 0}`;
    }
  } else if (data.expectedCtc) {
    expectedSalary = typeof data.expectedCtc === 'number' ? `₹${data.expectedCtc.toLocaleString('en-IN')} / yr` : String(data.expectedCtc);
  }

  const roleHeadline =
    (data.headline as string) ||
    (data.aboutMe as string)?.slice(0, 60) ||
    (workExperience[0]?.jobTitle) ||
    'Talented Professional';

  return {
    id: docId,
    uid: (data.uid as string) || docId,
    candidateId: docId,
    userId: (data.uid as string) || docId,
    fullName,
    firstName,
    lastName,
    name: fullName,
    email: (data.email as string) || '',
    phoneNumber: (data.phoneNumber as string) || (data.phone as string) || '',
    phone: (data.phoneNumber as string) || (data.phone as string) || '',
    photoUrl: (data.photoUrl as string) || (data.avatarUrl as string) || '',
    avatar: (data.photoUrl as string) || fullName.charAt(0).toUpperCase(),
    avatarUrl: (data.photoUrl as string) || (data.avatarUrl as string) || '',
    role: roleHeadline,
    headline: roleHeadline,
    currentCompany: workExperience[0]?.companyName || (data.currentCompany as string) || '',
    company: workExperience[0]?.companyName || (data.company as string) || '',
    totalExperienceYears: totalExpYears,
    experience: `${totalExpYears > 0 ? totalExpYears.toFixed(1) + ' Years' : 'Fresher'}`,
    location: locStr,
    currentLocation: typeof data.currentLocation === 'object' && data.currentLocation !== null ? (data.currentLocation as CandidateAddress) : locStr,
    skills: rawSkills,
    matchScore: (data.matchScore as number) || (data.aiMatchScore as number),
    matchReason: (data.matchReason as string) || (data.aiMatchReason as string),
    status: 'available',
    expectedSalary,
    expectedCtc: expectedSalary,
    noticePeriod: '30 Days',
    education,
    workExperience,
    workHistory: workExperience,
    projects,
    certifications,
    portfolioLinks: Array.isArray(data.otherLinks) ? data.otherLinks : [],
    resumeUrl: (data.resumeUrl as string) || '',
    portfolioUrl: (data.portfolioUrl as string) || '',
    githubProfile: (data.githubProfile as string) || '',
    linkedinProfile: (data.linkedinProfile as string) || '',
    otherLinks: Array.isArray(data.otherLinks) ? data.otherLinks : [],
    isProfilePublic: data.isProfilePublic !== false,
    about: (data.aboutMe as string) || (data.bio as string) || (data.about as string) || '',
    aboutMe: (data.aboutMe as string) || (data.bio as string) || '',
    summary: (data.aboutMe as string) || (data.bio as string) || '',
    appliedJob: data.appliedJob as string | undefined,
    createdAt: data.createdAt,
    updatedAt: data.lastUpdated || data.updatedAt,
  };
}

export const candidateService = {
  /**
   * Queries candidates from /candidates collection.
   */
  async getCandidates(limitCount: number = 50): Promise<Candidate[]> {
    try {
      const candidatesRef = collection(db, COLLECTIONS.CANDIDATES);
      const q = query(candidatesRef, orderBy('createdAt', 'desc'), limit(limitCount));
      const snap = await getDocs(q);
      return snap.docs.map((docSnap) =>
        parseCandidateDoc(docSnap.id, docSnap.data())
      );
    } catch (err) {
      console.error('[candidateService.getCandidates] Error:', err);
      // Fallback without ordering if index not present
      try {
        const fallbackQ = query(collection(db, COLLECTIONS.CANDIDATES), limit(limitCount));
        const snap = await getDocs(fallbackQ);
        return snap.docs.map((docSnap) =>
          parseCandidateDoc(docSnap.id, docSnap.data())
        );
      } catch {
        return [];
      }
    }
  },

  /**
   * Retrieves single candidate details by ID.
   */
  async getCandidateById(candidateId: string): Promise<Candidate | null> {
    try {
      if (!candidateId) return null;
      const docRef = doc(db, COLLECTIONS.CANDIDATES, candidateId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return parseCandidateDoc(snap.id, snap.data());
      }
      return null;
    } catch (err) {
      console.error('[candidateService.getCandidateById] Error:', err);
      return null;
    }
  },

  /**
   * Batch fetches multiple candidates by ID list.
   */
  async getCandidatesByIds(candidateIds: string[]): Promise<Map<string, Candidate>> {
    const candidateMap = new Map<string, Candidate>();
    if (!candidateIds || candidateIds.length === 0) return candidateMap;

    const uniqueIds = Array.from(new Set(candidateIds));
    // Fetch in batches of 10
    for (let i = 0; i < uniqueIds.length; i += 10) {
      const chunk = uniqueIds.slice(i, i + 10);
      const promises = chunk.map((id) => this.getCandidateById(id));
      const results = await Promise.all(promises);
      results.forEach((c) => {
        if (c) candidateMap.set(c.id, c);
      });
    }

    return candidateMap;
  },

  /**
   * Alias for getCandidates
   */
  async getAllCandidates(limitCount: number = 100): Promise<Candidate[]> {
    return this.getCandidates(limitCount);
  },

  /**
   * Verified Flutter Candidate Connect matching formula:
   * matchScore = Math.round((overlappingSkills.length / job.skillsRequired.length) * 100)
   */
  calculateMatchScore(candidateSkills: string[], jobSkills: string[]): number {
    if (!jobSkills || jobSkills.length === 0) return 50;
    if (!candidateSkills || candidateSkills.length === 0) return 0;

    const normalizedCandidateSkills = candidateSkills.map((s) => s.trim().toLowerCase());
    const normalizedJobSkills = jobSkills.map((s) => s.trim().toLowerCase());

    const overlapping = normalizedJobSkills.filter((js) =>
      normalizedCandidateSkills.some((cs) => cs === js || cs.includes(js) || js.includes(cs))
    );

    const score = Math.round((overlapping.length / normalizedJobSkills.length) * 100);
    return Math.min(100, Math.max(0, score));
  },

  /**
   * Alias for calculateMatchScore
   */
  calculateSkillMatch(candidateSkills: string[], jobSkills: string[]): number {
    return this.calculateMatchScore(candidateSkills, jobSkills);
  },

  /**
   * Verified Candidate Connect matching algorithm (>= 40% match) across active jobs
   */
  async getSuitableCandidatesForCompany(
    _companyId: string,
    activeJobs: import('@/types').Job[]
  ): Promise<CandidateMatchResult[]> {
    if (!activeJobs || activeJobs.length === 0) return [];
    const candidates = await this.getCandidates(100);
    const results: CandidateMatchResult[] = [];

    for (const candidate of candidates) {
      let highestScore = 0;
      let bestJob: import('@/types').Job | null = null;
      let bestMatchedSkills: string[] = [];

      for (const job of activeJobs) {
        const jobSkills = [
          ...(job.skillsRequired || job.skills || []),
        ];
        if (jobSkills.length === 0) continue;


        const candSkills = candidate.skills || [];
        const normCand = candSkills.map((s) => s.trim().toLowerCase());
        const normJob = jobSkills.map((s) => s.trim().toLowerCase());

        const matched = normJob.filter((js) =>
          normCand.some((cs) => cs === js || cs.includes(js) || js.includes(cs))
        );

        const score = Math.round((matched.length / normJob.length) * 100);
        if (score > highestScore) {
          highestScore = score;
          bestJob = job;
          bestMatchedSkills = candSkills.filter((cs) =>
            normJob.some((js) => cs.toLowerCase() === js || cs.toLowerCase().includes(js) || js.includes(cs.toLowerCase()))
          );
        }
      }

      if (highestScore >= 40 && bestJob) {
        results.push({
          candidate,
          matchedJob: bestJob,
          matchScore: highestScore,
          matchedSkills: bestMatchedSkills,
        });
      }
    }

    results.sort((a, b) => b.matchScore - a.matchScore);
    return results;
  },

  /**
   * Invites candidate to a job opening
   */
  async inviteCandidate(params: {
    candidateId: string;
    jobId: string;
    companyId?: string;
    recruiterId?: string;
  }): Promise<string> {
    const docId = `${params.jobId}_${params.candidateId}`;
    const docRef = doc(db, COLLECTIONS.JOB_APPLICATIONS, docId);

    const docSnapshot = await getDoc(docRef);
    if (docSnapshot.exists()) {
      throw new Error('Candidate has already applied or been invited to this role.');
    }

    await setDoc(docRef, {
      applicationId: docId,
      jobId: params.jobId,
      candidateId: params.candidateId,
      companyId: params.companyId || '',
      recruiterId: params.recruiterId || '',
      resumeUrl: '',
      coverLetter: '',
      applicationStatus: 'invited',
      stage: 'invited',
      appliedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      source: 'recruiter_invite',
    });

    return docId;
  },
};

export interface CandidateMatchResult {
  candidate: Candidate;
  matchedJob: import('@/types').Job;
  matchScore: number;
  matchedSkills: string[];
}

