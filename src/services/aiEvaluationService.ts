import { Candidate, Job } from '@/types';

export interface AiRecommendation {
  score: number;
  reason: string;
}

/**
 * AI Service Evaluation matching Flutter AIService.evaluate
 * 1. Skills Match (40%)
 * 2. Experience Match (30%)
 * 3. Location Match (20%)
 * 4. Remote / Work Mode Fit (10%)
 */
export const aiEvaluationService = {
  evaluate(candidate: Partial<Candidate>, job: Partial<Job>): AiRecommendation {
    let score = 0;
    const reasons: string[] = [];

    const jobSkills = job.skillsRequired || job.skills || [];
    const candidateSkills = candidate.skills || [];

    // 1. Skills Match (40%)
    if (jobSkills.length > 0) {
      let matchedSkills = 0;
      for (const skill of jobSkills) {
        if (
          candidateSkills.some(
            (s) =>
              s.toLowerCase().includes(skill.toLowerCase()) ||
              skill.toLowerCase().includes(s.toLowerCase())
          )
        ) {
          matchedSkills++;
        }
      }
      let skillScore = (matchedSkills / jobSkills.length) * 40;
      if (skillScore > 40) skillScore = 40;
      score += skillScore;
      if (matchedSkills > 0) {
        reasons.push(`Matches ${matchedSkills}/${jobSkills.length} skills`);
      }
    } else {
      score += 40;
    }

    // 2. Experience Match (30%)
    const totalExp =
      typeof candidate.totalExperienceYears === 'number'
        ? candidate.totalExperienceYears
        : parseInt(String(candidate.totalExperienceYears || candidate.experience || '0'), 10) || 0;
    const requiredMin = job.experienceRequired?.minYears ?? job.minExperienceYears ?? 0;

    if (totalExp >= requiredMin) {
      score += 30;
      reasons.push(`Meets experience requirement (${totalExp} years)`);
    } else if (totalExp > 0 && requiredMin > 0) {
      const expScore = (totalExp / requiredMin) * 20;
      score += expScore;
      reasons.push(`Has some experience (${totalExp} years)`);
    } else {
      reasons.push('No recorded experience');
    }

    // 3. Location Match (20%)
    const candCity =
      typeof candidate.currentLocation === 'object' && candidate.currentLocation !== null
        ? candidate.currentLocation.city
        : typeof candidate.location === 'object' && candidate.location !== null
        ? candidate.location.city
        : typeof candidate.currentLocation === 'string'
        ? candidate.currentLocation.split(',')[0]?.trim()
        : typeof candidate.location === 'string'
        ? candidate.location.split(',')[0]?.trim()
        : '';

    const jobCity =
      job.jobLocation?.city ||
      (typeof job.location === 'object' && job.location !== null
        ? job.location.city
        : typeof job.location === 'string'
        ? job.location.split(',')[0]?.trim()
        : '');

    if (candCity && jobCity && candCity.toLowerCase() === jobCity.toLowerCase()) {
      score += 20;
      reasons.push(`Located in ${candCity}`);
    } else {
      score += 10;
      reasons.push('Located in same country');
    }

    // 4. Remote / Work Mode Fit (10%)
    const workMode = (job.workMode || '').toLowerCase();
    if (workMode.includes('remote')) {
      score += 10;
      reasons.push('Remote job fit');
    } else if (candCity && jobCity && candCity.toLowerCase() === jobCity.toLowerCase()) {
      score += 10;
    }

    const finalScore = Math.min(100, Math.max(0, Math.round(score)));
    return {
      score: finalScore,
      reason: reasons.length > 0 ? reasons.join('. ') : 'Profile reviewed.',
    };
  },
};
