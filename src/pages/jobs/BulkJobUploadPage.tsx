import React, { useState, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowLeft,
  Building2,
  ShieldAlert,
  RotateCcw,
  Loader2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Check,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { jobService } from '@/services/jobService';
import { ROUTES } from '@/utils/constants';
import { formatCurrencyINR } from '@/utils/formatters';
import {
  bulkJobService,
  ValidatedJobRow,
  BulkUploadProgress,
  BulkUploadResult,
} from '@/services/bulkJobService';

export const BulkJobUploadPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, recruiterProfile, companyProfile, isSubscribed } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [validatedRows, setValidatedRows] = useState<ValidatedJobRow[]>([]);
  const [filterTab, setFilterTab] = useState<'all' | 'valid' | 'errors' | 'duplicates'>('all');
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [confirmDuplicates, setConfirmDuplicates] = useState<boolean>(false);

  const [publishing, setPublishing] = useState<boolean>(false);
  const [publishProgress, setPublishProgress] = useState<BulkUploadProgress | null>(null);
  const [publishResult, setPublishResult] = useState<BulkUploadResult | null>(null);

  const companyId = recruiterProfile?.companyId || user?.uid || '';
  const recruiterId = user?.uid || '';
  const recruiterName = recruiterProfile?.fullName || recruiterProfile?.displayName || user?.email?.split('@')[0] || 'Recruiter';
  const companyName = companyProfile?.profile?.companyName || 'TalentBay Recruiter';

  const validRows = validatedRows.filter((r) => r.isValid);
  const errorRows = validatedRows.filter((r) => !r.isValid);
  const duplicateRows = validatedRows.filter((r) => r.isDuplicate);
  const hasDuplicates = duplicateRows.length > 0;

  const displayedRows =
    filterTab === 'valid'
      ? validRows
      : filterTab === 'errors'
      ? errorRows
      : filterTab === 'duplicates'
      ? duplicateRows
      : validatedRows;

  // Handle template download
  const handleDownloadTemplate = () => {
    bulkJobService.downloadTemplate();
  };

  // Handle file selection and parsing
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const processFile = async (file: File) => {
    setSelectedFile(file);
    setParseError(null);
    setPublishResult(null);
    setConfirmDuplicates(false);
    setExpandedRows({});
    setParsing(true);

    try {
      // 1. Fetch active company job postings to perform duplicate detection
      let activeTitles: string[] = [];
      if (companyId) {
        try {
          const companyJobs = await jobService.getCompanyJobs(companyId);
          activeTitles = companyJobs
            .filter((j) => j.status === 'active')
            .map((j) => j.roleName || j.title || j.designationName)
            .filter(Boolean) as string[];
        } catch (fetchErr) {
          console.warn('[BulkJobUploadPage] Could not fetch active jobs for duplicate cross-check:', fetchErr);
        }
      }

      // 2. Parse Excel file rows
      const rawRows = await bulkJobService.parseExcelFile(file);

      // 3. Validate against standard 17-column rules
      const validated = bulkJobService.validateJobRows(rawRows);

      // 4. Cross-check duplicates against active listings
      const checkedRows = bulkJobService.checkDuplicates(validated, activeTitles);

      setValidatedRows(checkedRows);
      setFilterTab('all');
    } catch (err: unknown) {
      console.error('[BulkJobUploadPage] Parse error:', err);
      setParseError(err instanceof Error ? err.message : 'Failed to parse spreadsheet file.');
      setValidatedRows([]);
    } finally {
      setParsing(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setValidatedRows([]);
    setParseError(null);
    setPublishResult(null);
    setPublishProgress(null);
    setConfirmDuplicates(false);
    setExpandedRows({});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleRowExpanded = (rowNumber: number) => {
    setExpandedRows((prev) => ({
      ...prev,
      [rowNumber]: !prev[rowNumber],
    }));
  };

  // Handle Publish Valid Jobs
  const handlePublish = async () => {
    if (!recruiterId || !companyId) {
      setParseError('Missing recruiter account information. Please sign in again.');
      return;
    }

    if (!isSubscribed) {
      navigate(ROUTES.SUBSCRIPTION);
      return;
    }

    if (errorRows.length > 0) {
      setParseError('Please correct all invalid rows in your spreadsheet before posting.');
      return;
    }

    if (hasDuplicates && !confirmDuplicates) {
      setParseError('Please confirm duplicate warning check before posting.');
      return;
    }

    if (validRows.length === 0) {
      setParseError('No valid job entries to publish. Please fix sheet errors.');
      return;
    }

    setPublishing(true);
    setParseError(null);

    try {
      const result = await bulkJobService.publishBulkJobs(
        validRows,
        recruiterId,
        companyId,
        (prog) => setPublishProgress(prog)
      );

      setPublishResult(result);
    } catch (err: unknown) {
      console.error('[BulkJobUploadPage] Publish error:', err);
      setParseError(err instanceof Error ? err.message : 'Error publishing bulk jobs.');
    } finally {
      setPublishing(false);
      setPublishProgress(null);
    }
  };

  const isPostButtonDisabled =
    publishing ||
    validRows.length === 0 ||
    errorRows.length > 0 ||
    (hasDuplicates && !confirmDuplicates);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* 1. Top Navigation & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <NavLink
            to={ROUTES.JOBS}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition border border-slate-200"
            aria-label="Back to Jobs"
          >
            <ArrowLeft className="w-4 h-4" />
          </NavLink>

          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <NavLink to={ROUTES.DASHBOARD} className="hover:text-teal-700">
                Dashboard
              </NavLink>
              <span>/</span>
              <NavLink to={ROUTES.JOBS} className="hover:text-teal-700">
                Jobs
              </NavLink>
              <span>/</span>
              <span className="text-slate-800 font-semibold">Bulk Upload</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              Bulk Job Upload
            </h1>
          </div>
        </div>

        {/* Recruiter Context Card */}
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-sm">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="text-left">
            <p className="text-xs font-bold text-slate-900 truncate max-w-[180px]">
              {companyName}
            </p>
            <p className="text-[11px] text-slate-500 truncate max-w-[180px]">
              Logged in: <strong>{recruiterName}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* 2. Subscription Check Alert */}
      {!isSubscribed && (
        <div className="p-4 bg-amber-50 border border-amber-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold">Subscription Required for Publishing</p>
              <p className="text-amber-800 text-[11px] mt-0.5">
                You can download the template and validate your spreadsheet, but an active subscription is required to publish jobs to candidates.
              </p>
            </div>
          </div>
          <NavLink
            to={ROUTES.SUBSCRIPTION}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition shrink-0"
          >
            <span>Subscribe Now</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </NavLink>
        </div>
      )}

      {/* 3. Upload & Template Download Stage (When no file or before parsing) */}
      {validatedRows.length === 0 && (
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-xs space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 mx-auto flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Bulk Job Upload
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Create multiple jobs simultaneously in the TalentBay candidate ecosystem using Excel spreadsheets.
            </p>
          </div>

          {/* Drag & drop upload zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-teal-500 bg-slate-50/50 hover:bg-teal-50/20 rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 group max-w-2xl mx-auto"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200/60 flex items-center justify-center text-teal-600 group-hover:scale-105 transition-transform shadow-xs">
              {parsing ? (
                <Loader2 className="w-7 h-7 animate-spin" />
              ) : (
                <Upload className="w-7 h-7" />
              )}
            </div>

            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-bold text-slate-800">
                {selectedFile ? selectedFile.name : 'Drag and drop your Excel template here'}
              </p>
              <p className="text-[11px] text-slate-400">
                or click to browse local files (Supports .xlsx formats)
              </p>
            </div>

            <button
              type="button"
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-teal-700 bg-white border border-slate-200 rounded-xl group-hover:border-teal-300 shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{selectedFile ? 'Change File' : 'Browse Files'}</span>
            </button>
          </div>

          {/* Template Download Section */}
          <div className="max-w-2xl mx-auto p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-800">Need the format template?</p>
              <p className="text-[11px] text-slate-500">
                Download the pre-configured 17-column Excel template to start adding jobs.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-teal-700 bg-white hover:bg-teal-50 border border-teal-200/80 rounded-xl transition shadow-2xs shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Template</span>
            </button>
          </div>

          {parseError && (
            <div className="max-w-2xl mx-auto p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{parseError}</span>
            </div>
          )}
        </div>
      )}

      {/* 4. Review Uploaded Jobs Screen (Section 9, 10, 11) */}
      {validatedRows.length > 0 && (
        <div className="space-y-6">
          {/* Header & Stat Cards */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  Review Uploaded Jobs
                </h2>
                <p className="text-xs text-slate-500">
                  Verify parsed fields and address validation errors before posting
                </p>
              </div>

              {/* 3 Summary Stat Cards (Matching Manual Figure Page 6) */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4 shrink-0">
                {/* Total Parsed */}
                <div
                  onClick={() => setFilterTab('all')}
                  className={`p-3 sm:px-5 sm:py-3 rounded-2xl border text-center cursor-pointer transition ${
                    filterTab === 'all'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                    Total Parsed
                  </p>
                  <p className="text-lg sm:text-xl font-black mt-0.5">
                    {validatedRows.length}
                  </p>
                </div>

                {/* Valid (Ready to Post) */}
                <div
                  onClick={() => setFilterTab('valid')}
                  className={`p-3 sm:px-5 sm:py-3 rounded-2xl border text-center cursor-pointer transition ${
                    filterTab === 'valid'
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:border-emerald-300'
                  }`}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                    Valid (Ready to Post)
                  </p>
                  <p className="text-lg sm:text-xl font-black mt-0.5">
                    {validRows.length}
                  </p>
                </div>

                {/* Invalid (Needs Fix) */}
                <div
                  onClick={() => setFilterTab('errors')}
                  className={`p-3 sm:px-5 sm:py-3 rounded-2xl border text-center cursor-pointer transition ${
                    filterTab === 'errors'
                      ? 'bg-red-700 text-white border-red-700'
                      : errorRows.length > 0
                      ? 'bg-red-50 text-red-800 border-red-200 hover:border-red-300'
                      : 'bg-slate-50 text-slate-500 border-slate-200'
                  }`}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                    Invalid (Needs Fix)
                  </p>
                  <p className="text-lg sm:text-xl font-black mt-0.5">
                    {errorRows.length}
                  </p>
                </div>
              </div>
            </div>

            {/* Potential Duplicates Detected Warning Banner (Section 11, Figure 4) */}
            {hasDuplicates && (
              <div className="p-4 sm:p-5 bg-amber-50 border border-amber-300 rounded-2xl space-y-1.5 text-amber-950">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <h4 className="font-bold text-xs sm:text-sm text-amber-900">
                    Potential Duplicates Detected
                  </h4>
                </div>
                <p className="text-xs text-amber-800 pl-7 leading-relaxed">
                  Some of the uploaded job titles match titles that you already have active. Posting them will create duplicate listings. Please confirm duplicate warning check below to enable posting.
                </p>
              </div>
            )}

            {parseError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{parseError}</span>
              </div>
            )}

            {/* Publishing Progress Bar */}
            {publishing && publishProgress && (
              <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-teal-900">
                  <span>
                    Publishing job {publishProgress.current} of {publishProgress.total}...
                  </span>
                  <span>
                    {Math.round((publishProgress.current / publishProgress.total) * 100)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-teal-200/60 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-600 transition-all duration-300"
                    style={{
                      width: `${(publishProgress.current / publishProgress.total) * 100}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-teal-700 truncate">
                  Role: {publishProgress.currentRole}
                </p>
              </div>
            )}

            {/* Review Table (Matching Section 10, Figure 4 & 5) */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4 w-14">Row</th>
                      <th className="py-3 px-4">Job Title / Role</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">Mode / Type</th>
                      <th className="py-3 px-4">Experience</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-400 text-xs">
                          No rows match the selected filter.
                        </td>
                      </tr>
                    ) : (
                      displayedRows.map((r) => {
                        const isExpanded = Boolean(expandedRows[r.rowNumber]);
                        const isDuplicate = Boolean(r.isDuplicate && r.isValid);

                        return (
                          <React.Fragment key={r.rowNumber}>
                            <tr
                              className={`hover:bg-slate-50/80 transition ${
                                !r.isValid
                                  ? 'bg-red-50/30'
                                  : isDuplicate
                                  ? 'bg-amber-50/30'
                                  : ''
                              }`}
                            >
                              <td className="py-3.5 px-4 font-bold text-slate-600">
                                {r.rowNumber}
                              </td>

                              <td className="py-3.5 px-4 font-bold text-slate-900 max-w-[200px]">
                                <div className="truncate">
                                  {r.raw.title || (
                                    <span className="text-red-500 font-normal italic">
                                      Missing Title
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="py-3.5 px-4 text-slate-600">
                                {r.raw.city
                                  ? `${r.raw.city}, ${r.raw.country || 'India'}`
                                  : <span className="text-red-500 italic">Missing City</span>}
                              </td>

                              <td className="py-3.5 px-4 text-slate-600">
                                <div>
                                  <span className="font-medium text-slate-800">
                                    {r.raw.workMode || 'Onsite'}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block">
                                    {r.raw.employmentType || 'Full-Time'}
                                  </span>
                                </div>
                              </td>

                              <td className="py-3.5 px-4 text-slate-600">
                                {r.raw.experienceLevel === 'Fresher'
                                  ? 'Fresher'
                                  : r.raw.minExperience !== undefined
                                  ? `${r.raw.minExperience} - ${r.raw.maxExperience ?? r.raw.minExperience} Yrs`
                                  : 'Experienced'}
                              </td>

                              {/* Status Badge */}
                              <td className="py-3.5 px-4">
                                {!r.isValid ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 whitespace-nowrap">
                                    <XCircle className="w-3 h-3 text-red-600" />
                                    Invalid
                                  </span>
                                ) : isDuplicate ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 whitespace-nowrap">
                                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                                    Potential Duplicate
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    Valid
                                  </span>
                                )}
                              </td>

                              {/* Details Toggle Chevron */}
                              <td className="py-3.5 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => toggleRowExpanded(r.rowNumber)}
                                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                                  aria-label="Toggle details"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </button>
                              </td>
                            </tr>

                            {/* Specific Red Validation Errors Below Row (Section 9, Figure Page 6) */}
                            {!r.isValid && (
                              <tr className="bg-red-50/40">
                                <td colSpan={7} className="px-6 py-2 border-b border-red-100">
                                  <ul className="text-[11px] text-red-600 space-y-0.5 list-disc list-inside">
                                    {r.errors.map((err, i) => (
                                      <li key={i}>{err}</li>
                                    ))}
                                  </ul>
                                </td>
                              </tr>
                            )}

                            {/* Expandable Details Drawer (Section 10) */}
                            {isExpanded && (
                              <tr className="bg-slate-50/60 border-b border-slate-200">
                                <td colSpan={7} className="p-4 sm:p-5">
                                  <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-3 shadow-2xs">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                      <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                                          Vacancies & Offices
                                        </p>
                                        <p className="font-semibold text-slate-800 mt-0.5">
                                          {r.raw.vacancies ?? 1} Openings ({r.raw.officeCount ?? 1} Office{r.raw.officeCount !== 1 ? 's' : ''})
                                        </p>
                                      </div>

                                      <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                                          Offered Salary
                                        </p>
                                        <p className="font-semibold text-slate-800 mt-0.5">
                                          {r.raw.minSalary
                                            ? `${formatCurrencyINR(r.raw.minSalary)} - ${formatCurrencyINR(r.raw.maxSalary ?? r.raw.minSalary)} (${r.raw.salaryCurrency || 'INR / Per Annum'})`
                                            : 'Not Specified (Negotiable)'}
                                        </p>
                                      </div>

                                      <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                                          Educational Qualification
                                        </p>
                                        <p className="font-semibold text-slate-800 mt-0.5 truncate">
                                          {r.raw.educationalQualification || 'Any Graduate'}
                                        </p>
                                      </div>
                                    </div>

                                    <div>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                                        Required Skills
                                      </p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {r.raw.skillsRequired
                                          ? r.raw.skillsRequired.split(',').map((s, idx) => (
                                              <span
                                                key={idx}
                                                className="text-[11px] px-2 py-0.5 rounded bg-teal-50 text-teal-700 font-medium border border-teal-200/60"
                                              >
                                                {s.trim()}
                                              </span>
                                            ))
                                          : <span className="text-slate-400 text-xs italic">None specified</span>}
                                      </div>
                                    </div>

                                    {r.raw.jobDescription && (
                                      <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                                          Job Description
                                        </p>
                                        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                                          {r.raw.jobDescription}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Duplicate Warning Checkbox (Section 11, Figure 4) */}
            {hasDuplicates && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3">
                <input
                  type="checkbox"
                  id="confirm-duplicates-checkbox"
                  checked={confirmDuplicates}
                  onChange={(e) => setConfirmDuplicates(e.target.checked)}
                  className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                />
                <label
                  htmlFor="confirm-duplicates-checkbox"
                  className="text-xs font-semibold text-slate-800 cursor-pointer select-none"
                >
                  I confirm that I want to proceed and post potential duplicate jobs.
                </label>
              </div>
            )}

            {/* Action Bar (Upload Different File & Post Valid Jobs Button) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleReset}
                disabled={publishing}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Upload Different File</span>
              </button>

              <button
                type="button"
                onClick={handlePublish}
                disabled={isPostButtonDisabled}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition shadow-xs hover:shadow cursor-pointer"
              >
                {publishing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Publishing Jobs...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Post {validRows.length} Valid Job{validRows.length !== 1 ? 's' : ''}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Bulk Post Completed Confirmation Modal (Section 14, Figure 6) */}
      {publishResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200/90 text-center space-y-6 animate-in zoom-in-95 duration-200">
            {/* Checkmark Circle */}
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <Check className="w-8 h-8 stroke-[2.5]" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-bold text-slate-900">
                Bulk Post Completed
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Your jobs have been successfully stored in the TalentBay candidate system.
              </p>
            </div>

            {/* Summary Stat Boxes */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Successfully Created
                </p>
                <p className="text-xl font-black text-emerald-600 mt-1">
                  {publishResult.successCount}
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Failed / Errors
                </p>
                <p className="text-xl font-black text-slate-700 mt-1">
                  {publishResult.failedCount}
                </p>
              </div>
            </div>

            {publishResult.failedCount > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-left text-xs text-red-800 space-y-1">
                <p className="font-bold">Errors encountered:</p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  {publishResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Close Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  handleReset();
                  navigate(ROUTES.JOBS);
                }}
                className="w-full inline-flex items-center justify-center px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 active:bg-slate-950 rounded-xl transition shadow-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
