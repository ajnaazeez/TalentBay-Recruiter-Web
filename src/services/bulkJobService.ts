import * as XLSX from 'xlsx';
import { collection, doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/utils/constants';
import { Job, JobLocation, JobSalary, JobExperienceRequired } from '@/types';

export interface RawBulkJobRow {
  rowNumber: number;
  title: string;
  employmentType: string;
  workMode: string;
  country: string;
  state: string;
  city: string;
  officeCount?: number;
  vacancies?: number;
  skillsRequired: string;
  experienceLevel: string;
  minExperience?: number;
  maxExperience?: number;
  minSalary?: number;
  maxSalary?: number;
  salaryCurrency?: string;
  jobDescription?: string;
  educationalQualification?: string;
}

export interface ValidatedJobRow {
  rowNumber: number;
  raw: RawBulkJobRow;
  isValid: boolean;
  errors: string[];
  isDuplicate?: boolean;
  jobPayload?: Partial<Job>;
}

export interface BulkUploadProgress {
  current: number;
  total: number;
  currentRole: string;
}

export interface BulkUploadResult {
  total: number;
  successCount: number;
  failedCount: number;
  errors: string[];
  createdJobIds: string[];
}

/**
 * Standard 17 Column Headers matching the TalentBay Bulk Job Upload Portal Manual (Section 6, Page 5)
 */
export const BULK_TEMPLATE_HEADERS = [
  'Job Title / Role',
  'Employment Type',
  'Work Mode',
  'Country',
  'State',
  'City',
  'Number of Offices',
  'Number of Openings',
  'Required Skills',
  'Experience Level',
  'Minimum Experience',
  'Maximum Experience',
  'Minimum Salary',
  'Maximum Salary',
  'Salary Currency / Period',
  'Job Description',
  'Educational Qualification',
];

export const SAMPLE_ROW_1 = [
  'Senior Flutter Developer',
  'Full-Time',
  'Remote',
  'India',
  'Karnataka',
  'Bengaluru',
  1,
  3,
  'Flutter, Dart, Firebase, Riverpod',
  'Experienced',
  3,
  6,
  1200000,
  1800000,
  'INR / Per Annum',
  'We are seeking a senior Flutter developer with deep knowledge of building performant mobile apps and integrations.',
  'B.Tech / MCA',
];

export const SAMPLE_ROW_2 = [
  'Junior Operations Executive',
  'Full-Time',
  'Onsite',
  'India',
  'Kerala',
  'Kochi',
  1,
  1,
  'MS Excel, Operations, English Communication',
  'Fresher',
  0,
  0,
  300000,
  450000,
  'INR / Per Annum',
  'Looking for a passionate fresher to assist in day-to-day operations and reporting at our head office.',
  'BBA / B.Com / Any Graduate',
];

const VALID_EMPLOYMENT_TYPES = ['Full-Time', 'Part-Time', 'Contract'];
const VALID_WORK_MODES = ['Onsite', 'Hybrid', 'Remote'];
const VALID_EXP_LEVELS = ['Fresher', 'Experienced'];

export const bulkJobService = {
  /**
   * Generates and triggers browser download of the official TalentBay Excel template (.xlsx)
   * with the standard 17 columns and sample rows.
   */
  downloadTemplate(): void {
    const ws = XLSX.utils.aoa_to_sheet([
      BULK_TEMPLATE_HEADERS,
      SAMPLE_ROW_1,
      SAMPLE_ROW_2,
    ]);

    // Auto-fit column widths
    ws['!cols'] = BULK_TEMPLATE_HEADERS.map((h) => ({
      wch: Math.max(h.length + 3, 16),
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Jobs Template');
    XLSX.writeFile(wb, 'TalentBay_Bulk_Job_Upload_Template.xlsx');
  },

  /**
   * Parses an uploaded Excel (.xlsx, .xls) file into raw job rows across the 17 standard columns.
   */
  async parseExcelFile(file: File): Promise<RawBulkJobRow[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const buffer = e.target?.result;
          if (!buffer) {
            throw new Error('Failed to read spreadsheet file data.');
          }

          const workbook = XLSX.read(buffer, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          if (!firstSheetName) {
            throw new Error('Spreadsheet contains no sheets.');
          }

          const worksheet = workbook.Sheets[firstSheetName];
          const rawData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 });

          if (rawData.length <= 1) {
            throw new Error('The spreadsheet has no data rows. Please fill in job details below the header.');
          }

          const rows: RawBulkJobRow[] = [];

          for (let i = 1; i < rawData.length; i++) {
            const r = rawData[i] as (string | number | undefined)[];
            if (!r || r.length === 0) continue;

            // Skip completely blank rows
            const hasAnyValue = r.some((cell) => cell !== undefined && cell !== null && String(cell).trim() !== '');
            if (!hasAnyValue) continue;

            const parseNum = (val: unknown): number | undefined => {
              if (val === undefined || val === null || String(val).trim() === '') return undefined;
              const clean = String(val).replace(/[^0-9.-]/g, '');
              const num = parseFloat(clean);
              return isNaN(num) ? undefined : num;
            };

            const parseIntVal = (val: unknown): number | undefined => {
              if (val === undefined || val === null || String(val).trim() === '') return undefined;
              const clean = String(val).replace(/[^0-9-]/g, '');
              const num = parseInt(clean, 10);
              return isNaN(num) ? undefined : num;
            };

            rows.push({
              rowNumber: i + 1,
              title: String(r[0] ?? '').trim(),
              employmentType: String(r[1] ?? '').trim(),
              workMode: String(r[2] ?? '').trim(),
              country: String(r[3] ?? '').trim(),
              state: String(r[4] ?? '').trim(),
              city: String(r[5] ?? '').trim(),
              officeCount: parseIntVal(r[6]),
              vacancies: parseIntVal(r[7]),
              skillsRequired: String(r[8] ?? '').trim(),
              experienceLevel: String(r[9] ?? '').trim(),
              minExperience: parseNum(r[10]),
              maxExperience: parseNum(r[11]),
              minSalary: parseNum(r[12]),
              maxSalary: parseNum(r[13]),
              salaryCurrency: String(r[14] ?? '').trim(),
              jobDescription: String(r[15] ?? '').trim(),
              educationalQualification: String(r[16] ?? '').trim(),
            });
          }

          if (rows.length === 0) {
            throw new Error('No valid job rows found in spreadsheet.');
          }

          resolve(rows);
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file from disk.'));
      };

      reader.readAsArrayBuffer(file);
    });
  },

  /**
   * Validates raw job rows against the 10 core required fields, allowed enums, numeric rules,
   * and optional fields according to the User Manual.
   */
  validateJobRows(rows: RawBulkJobRow[]): ValidatedJobRow[] {
    return rows.map((r) => {
      const errors: string[] = [];

      // 1. Job Title / Role (Required)
      if (!r.title) {
        errors.push('Job Title / Role is required.');
      }

      // 2. Employment Type (Required: Full-Time, Part-Time, Contract)
      if (!r.employmentType) {
        errors.push('Employment Type is required.');
      } else if (!VALID_EMPLOYMENT_TYPES.includes(r.employmentType)) {
        errors.push(`Invalid Employment Type: '${r.employmentType}'. Allowed values: ${VALID_EMPLOYMENT_TYPES.join(', ')}`);
      }

      // 3. Work Mode (Required: Onsite, Hybrid, Remote)
      if (!r.workMode) {
        errors.push('Work Mode is required.');
      } else if (!VALID_WORK_MODES.includes(r.workMode)) {
        errors.push(`Invalid Work Mode: '${r.workMode}'. Allowed values: ${VALID_WORK_MODES.join(', ')}`);
      }

      // 4. Country (Required)
      if (!r.country) {
        errors.push('Country is required (e.g. India).');
      }

      // 5. State (Required)
      if (!r.state) {
        errors.push('State is required (e.g. Karnataka).');
      }

      // 6. City (Required)
      if (!r.city) {
        errors.push('City is required (e.g. Bengaluru).');
      }

      // 7. Number of Offices (Required: Whole number >= 1)
      if (r.officeCount === undefined || isNaN(r.officeCount) || r.officeCount <= 0) {
        errors.push('Number of Offices is required and must be a whole number (e.g. 1).');
      }

      // 8. Number of Openings (Required: Whole number >= 1)
      if (r.vacancies === undefined || isNaN(r.vacancies) || r.vacancies <= 0) {
        errors.push('Number of Openings is required and must be a whole number (e.g. 3).');
      }

      // 9. Required Skills (Required: comma-separated)
      const skillsArray = r.skillsRequired
        ? r.skillsRequired.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      if (!r.skillsRequired || skillsArray.length === 0) {
        errors.push('Required Skills is required (comma-separated, e.g. "Flutter, Dart").');
      }

      // 10. Experience Level (Required: Fresher or Experienced)
      if (!r.experienceLevel) {
        errors.push('Experience Level is required (Fresher or Experienced).');
      } else if (!VALID_EXP_LEVELS.includes(r.experienceLevel)) {
        errors.push(`Invalid Experience Level: '${r.experienceLevel}'. Allowed values: ${VALID_EXP_LEVELS.join(', ')}`);
      }

      // 11 & 12. Minimum and Maximum Experience Rules
      let minExp = 0;
      let maxExp = 0;

      if (r.experienceLevel === 'Experienced') {
        if (r.minExperience === undefined || isNaN(r.minExperience)) {
          errors.push('Minimum Experience is required for Experienced level (e.g. 1 or 3).');
        } else {
          minExp = Math.max(0, r.minExperience);
        }

        if (r.maxExperience === undefined || isNaN(r.maxExperience)) {
          errors.push('Maximum Experience is required for Experienced level (e.g. 3 or 6).');
        } else {
          maxExp = Math.max(0, r.maxExperience);
        }

        if (
          r.minExperience !== undefined &&
          r.maxExperience !== undefined &&
          !isNaN(r.minExperience) &&
          !isNaN(r.maxExperience) &&
          r.maxExperience < r.minExperience
        ) {
          errors.push(`Maximum Experience (${r.maxExperience} yrs) cannot be less than Minimum Experience (${r.minExperience} yrs).`);
        }
      } else if (r.experienceLevel === 'Fresher') {
        minExp = r.minExperience !== undefined && !isNaN(r.minExperience) ? Math.max(0, r.minExperience) : 0;
        maxExp = r.maxExperience !== undefined && !isNaN(r.maxExperience) ? Math.max(0, r.maxExperience) : minExp;
        if (maxExp < minExp) {
          errors.push(`Maximum Experience (${maxExp} yrs) cannot be less than Minimum Experience (${minExp} yrs).`);
        }
      }

      // 13 & 14. Salary Rules (Optional)
      const minSal = r.minSalary !== undefined && !isNaN(r.minSalary) ? Math.max(0, r.minSalary) : 0;
      const maxSal = r.maxSalary !== undefined && !isNaN(r.maxSalary) ? Math.max(0, r.maxSalary) : minSal;

      if (
        r.minSalary !== undefined &&
        r.maxSalary !== undefined &&
        !isNaN(r.minSalary) &&
        !isNaN(r.maxSalary) &&
        r.maxSalary < r.minSalary
      ) {
        errors.push(`Maximum Salary (₹${r.maxSalary}) cannot be less than Minimum Salary (₹${r.minSalary}).`);
      }

      // Payload Construction
      const location: JobLocation = {
        country: r.country || 'India',
        state: r.state || 'Karnataka',
        city: r.city || 'Bengaluru',
      };

      const salary: JobSalary = {
        min: minSal,
        max: maxSal,
        currency: 'INR',
        type: 'CTC',
      };

      const experienceRequired: JobExperienceRequired = {
        minYears: minExp,
        maxYears: maxExp,
      };

      const jobPayload: Partial<Job> = {
        roleName: r.title,
        designationName: r.title,
        title: r.title,
        roleId: 'custom',
        designationId: 'custom',
        employmentType: r.employmentType || 'Full-Time',
        workMode: r.workMode || 'Onsite',
        experienceLevel: (r.experienceLevel as 'Fresher' | 'Experienced') || (minExp > 0 ? 'Experienced' : 'Fresher'),
        jobLocation: location,
        salary,
        salaryRange: { min: minSal, max: maxSal, currency: 'INR' },
        experienceRequired,
        vacancies: r.vacancies || 1,
        officeCount: r.officeCount || 1,
        skillsRequired: skillsArray,
        mustHaveSkills: skillsArray,
        niceToHaveSkills: [],
        jobDescription: r.jobDescription || '',
        description: r.jobDescription || '',
        educationalQualification: r.educationalQualification || '',
        salaryCurrency: r.salaryCurrency || 'INR',
        salaryPeriod: r.salaryCurrency || 'INR / Per Annum',
        responsibilities: r.jobDescription ? [r.jobDescription] : [],
        requirements: r.educationalQualification ? [r.educationalQualification] : [],
        status: 'active',
        visibility: 'public',
        interviewProcess: [],
        extraQuestions: [],
      };

      return {
        rowNumber: r.rowNumber,
        raw: r,
        isValid: errors.length === 0,
        errors,
        isDuplicate: false,
        jobPayload,
      };
    });
  },

  /**
   * Cross-checks uploaded job titles against the company's currently active job postings.
   * Marks matched rows with isDuplicate = true.
   */
  checkDuplicates(
    rows: ValidatedJobRow[],
    activeJobTitles: string[]
  ): ValidatedJobRow[] {
    const normalizedActiveTitles = new Set(
      activeJobTitles
        .map((t) => (t || '').trim().toLowerCase())
        .filter(Boolean)
    );

    return rows.map((row) => {
      const rawTitle = (row.raw.title || '').trim().toLowerCase();
      const isDuplicate = rawTitle !== '' && normalizedActiveTitles.has(rawTitle);

      return {
        ...row,
        isDuplicate,
      };
    });
  },

  /**
   * Publishes verified jobs to Firestore /jobs collection.
   * Attaches recruiterId, companyId, active status, and 30-day expiration.
   */
  async publishBulkJobs(
    validRows: ValidatedJobRow[],
    recruiterId: string,
    companyId: string,
    onProgress?: (progress: BulkUploadProgress) => void
  ): Promise<BulkUploadResult> {
    const total = validRows.length;
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    const createdJobIds: string[] = [];

    const now = new Date();
    const expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiryTimestamp = Timestamp.fromDate(expiryDate);

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      const payload = row.jobPayload;

      if (!payload) {
        failedCount++;
        errors.push(`Row ${row.rowNumber}: Missing payload`);
        continue;
      }

      if (onProgress) {
        onProgress({
          current: i + 1,
          total,
          currentRole: payload.roleName || `Row ${row.rowNumber}`,
        });
      }

      try {
        const newDocRef = doc(collection(db, COLLECTIONS.JOBS));
        const finalJobData = {
          ...payload,
          jobId: newDocRef.id,
          recruiterId,
          companyId,
          postedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          expiresAt: expiryTimestamp,
          status: 'active',
          visibility: 'public',
        };

        await setDoc(newDocRef, finalJobData);
        createdJobIds.push(newDocRef.id);
        successCount++;
      } catch (err: unknown) {
        console.error(`[bulkJobService.publishBulkJobs] Error publishing row ${row.rowNumber}:`, err);
        failedCount++;
        errors.push(`Row ${row.rowNumber} ("${payload.roleName}"): ${err instanceof Error ? err.message : 'Database error'}`);
      }
    }

    return {
      total,
      successCount,
      failedCount,
      errors,
      createdJobIds,
    };
  },
};
