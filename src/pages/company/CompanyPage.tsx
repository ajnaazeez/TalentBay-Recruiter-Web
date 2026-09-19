import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe,
  Mail,
  MapPin,
  Users,
  Briefcase,
  FileText,
  Share2,
  Edit3,
  ExternalLink,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { companyService } from '@/services/companyService';
import { CompanyModel } from '@/types/company';
import { ROUTES } from '@/utils/constants';

function isFieldCompleted(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === 'number') return !isNaN(val) && val > 0;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return false;
    const lower = trimmed.toLowerCase();
    if (lower === 'not specified') return false;
    if (lower === 'organization') return false;
    if (lower === 'company') return false;
    if (lower === 'technology') return false;
    if (lower === 'no company description provided.') return false;
    return true;
  }
  if (Array.isArray(val)) return val.length > 0;
  return false;
}

export const CompanyPage: React.FC = () => {
  const navigate = useNavigate();
  const { recruiterProfile } = useAuth();
  const [company, setCompany] = useState<CompanyModel | null>(null);
  const [loading, setLoading] = useState(true);

  const companyId = recruiterProfile?.companyId;

  useEffect(() => {
    const loadCompany = async () => {
      if (!companyId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const comp = await companyService.getCompanyById(companyId);
        setCompany(comp);
      } catch (err) {
        console.error('Error fetching company details:', err);
      } finally {
        setLoading(false);
      }
    };
    loadCompany();
  }, [companyId]);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400">
        <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-medium">Loading organization profile...</p>
      </div>
    );
  }

  const rawCompany = company as Record<string, any> | null;
  const name = company?.profile?.companyName || company?.profile?.name || rawCompany?.name || rawCompany?.companyName || 'Organization';
  const tagline = company?.profile?.tagline || '';
  const rawAbout = company?.profile?.about || company?.profile?.description || rawCompany?.about || rawCompany?.aboutCompany || '';
  const about = rawAbout.trim() ? rawAbout : 'Not specified';
  const website = company?.profile?.website || company?.contact?.website || rawCompany?.website || '';
  
  const rawIndustry = company?.profile?.industry || company?.business?.industry || rawCompany?.industry || '';
  const isLegacyInd = typeof rawIndustry === 'string' && rawIndustry.trim().toLowerCase() === 'technology';
  const cleanIndustry = isLegacyInd ? '' : (typeof rawIndustry === 'string' ? rawIndustry.trim() : '');
  const industry = cleanIndustry ? cleanIndustry : 'Not specified';

  const rawCompanySize = company?.profile?.companySize || company?.business?.companySize || company?.business?.size || rawCompany?.companySize || '';
  const isLegacySize = typeof rawCompanySize === 'string' && (rawCompanySize.trim() === '11-50' || rawCompanySize.trim().toLowerCase() === '11-50 employees') && isLegacyInd;
  const cleanCompanySize = isLegacySize ? '' : (typeof rawCompanySize === 'string' ? rawCompanySize.trim() : '');
  const companySizeDisplay = cleanCompanySize 
    ? (cleanCompanySize.toLowerCase().endsWith('employees') ? cleanCompanySize : `${cleanCompanySize} Employees`) 
    : 'Not specified';

  const rawFoundedYear = company?.profile?.foundedYear || company?.business?.foundedYear;
  const foundedYear = rawFoundedYear && String(rawFoundedYear).trim() ? String(rawFoundedYear).trim() : 'Not specified';
  const isVerified = company?.verification?.isVerified || false;

  const email = company?.contact?.officialEmail || company?.contact?.email || rawCompany?.email || 'Not specified';
  const phone = company?.contact?.phone || rawCompany?.phone || 'Not specified';
  const primaryAddress = company?.contact?.primaryAddress;
  const additionalOffices = company?.contact?.additionalOffices || [];

  const gst = company?.business?.gstNumber || 'Not specified';
  const regNumber = company?.business?.registrationNumber || 'Not specified';

  const linkedin = company?.social?.linkedin;
  const twitter = company?.social?.twitter;

  // Profile completion calculation based on available company model fields
  const profileFields = [
    { name: 'Company Name', isComplete: isFieldCompleted(name) && name !== 'Organization' && name !== 'Company' },
    { name: 'Official Email', isComplete: isFieldCompleted(email) },
    { name: 'Phone Number', isComplete: isFieldCompleted(phone) },
    { name: 'Industry', isComplete: isFieldCompleted(cleanIndustry) },
    { name: 'Company Size', isComplete: isFieldCompleted(cleanCompanySize) },
    { name: 'Founded Year', isComplete: isFieldCompleted(rawFoundedYear) },
    { name: 'About / Description', isComplete: isFieldCompleted(rawAbout) },
    { name: 'Website', isComplete: isFieldCompleted(website) },
    { name: 'Company Logo', isComplete: isFieldCompleted(company?.profile?.logoUrl || rawCompany?.logoUrl) },
    { name: 'Primary Address', isComplete: isFieldCompleted(primaryAddress?.city || primaryAddress?.street || company?.contact?.city) },
  ];

  const completedFieldsCount = profileFields.filter((f) => f.isComplete).length;
  const totalApplicableFields = profileFields.length;
  const completionPercentage = Math.round((completedFieldsCount / totalApplicableFields) * 100);
  const isProfileComplete = completionPercentage === 100;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Header Identity Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-teal-700 to-slate-800 text-white font-black text-2xl flex items-center justify-center shadow-xs shrink-0 overflow-hidden ring-4 ring-slate-50">
            {company?.profile?.logoUrl ? (
              <img
                src={company.profile.logoUrl}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              name.charAt(0).toUpperCase()
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {name}
              </h1>
              {isVerified && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Verified Employer
                </span>
              )}
            </div>

            {tagline && (
              <p className="text-xs sm:text-sm text-slate-500 font-medium">{tagline}</p>
            )}

            {website && (
              <a
                href={website.startsWith('http') ? website : `https://${website}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-teal-700 hover:underline inline-flex items-center gap-1 pt-0.5"
              >
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <span>{website}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate(ROUTES.COMPANY_EDIT)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-black rounded-xl transition shadow-xs shrink-0"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Edit Company Profile</span>
        </button>
      </div>

      {/* Dynamic Profile Completion Indicator Section */}
      {!isProfileComplete ? (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200/70 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Profile Completion
                </span>
                <span className="text-xs font-black text-teal-800">{completionPercentage}%</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Your company profile is {completionPercentage}% complete.
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">
                Complete your company profile to provide more information about your organization.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate(ROUTES.COMPANY_EDIT)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition shrink-0"
            >
              <span>Complete Profile</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>{completedFieldsCount} of {totalApplicableFields} fields completed</span>
              <span>{completionPercentage}% complete</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-emerald-50/90 via-teal-50/60 to-emerald-50/90 rounded-3xl p-6 sm:p-7 border border-emerald-200/90 shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 border border-emerald-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    100% Complete
                  </span>
                </div>
                <h3 className="text-base font-bold text-emerald-950 mt-0.5">
                  Your company profile is complete.
                </h3>
                <p className="text-xs text-emerald-800">
                  All organization details and verified contact information are configured.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate(ROUTES.COMPANY_EDIT)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-white/80 hover:bg-white border border-emerald-200 rounded-xl transition shadow-2xs"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Update Profile</span>
            </button>
          </div>
          <div className="w-full h-2 bg-emerald-200/80 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-600 rounded-full w-full" />
          </div>
        </div>
      )}

      {/* Grid: Key Attributes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-teal-600" /> Industry
          </span>
          <p className="text-sm font-bold text-slate-900">{industry}</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-teal-600" /> Company Size
          </span>
          <p className="text-sm font-bold text-slate-900">{companySizeDisplay}</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-teal-600" /> Founded Year
          </span>
          <p className="text-sm font-bold text-slate-900">{foundedYear}</p>
        </div>
      </div>

      {/* About Section */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          About the Organization
        </h3>
        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
          {about}
        </p>
      </div>

      {/* Contact & Address Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Mail className="w-4 h-4 text-teal-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Official Contact
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Official Email</span>
              <p className="font-bold text-slate-900">{email}</p>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Phone Number</span>
              <p className="font-bold text-slate-900">{phone}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <MapPin className="w-4 h-4 text-teal-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Primary Office Address
            </h3>
          </div>

          <div className="space-y-1.5 text-xs text-slate-700">
            {primaryAddress ? (
              <>
                {primaryAddress.street && <p className="font-semibold">{primaryAddress.street}</p>}
                <p>
                  {primaryAddress.city}
                  {primaryAddress.state ? `, ${primaryAddress.state}` : ''}
                  {primaryAddress.postalCode ? ` - ${primaryAddress.postalCode}` : ''}
                </p>
                <p className="font-bold text-slate-900">{primaryAddress.country || 'India'}</p>
              </>
            ) : (
              <p className="text-slate-400">Primary location not configured.</p>
            )}
          </div>
        </div>
      </div>

      {/* Additional Office Locations (if any) */}
      {additionalOffices.length > 0 && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Branch & Additional Office Locations
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {additionalOffices.map((office: import('@/types/company').CompanyOfficeLocation, idx: number) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <p className="text-xs font-bold text-slate-900">
                  {office.city}, {office.country}
                </p>
                {office.street && <p className="text-[11px] text-slate-500">{office.street}</p>}
              </div>
            ))}
          </div>


        </div>
      )}

      {/* Business & Social Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileText className="w-4 h-4 text-teal-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Business Registration
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">GST / Tax ID</span>
              <p className="font-bold text-slate-900">{gst}</p>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Registration Number / CIN</span>
              <p className="font-bold text-slate-900">{regNumber}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Share2 className="w-4 h-4 text-teal-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Social Links
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">LinkedIn</span>
              {linkedin ? (
                <a
                  href={linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="text-teal-700 font-semibold hover:underline inline-flex items-center gap-1"
                >
                  <span>{linkedin}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <p className="text-slate-400">Not linked</p>
              )}
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">Twitter / X</span>
              {twitter ? (
                <a
                  href={twitter}
                  target="_blank"
                  rel="noreferrer"
                  className="text-teal-700 font-semibold hover:underline inline-flex items-center gap-1"
                >
                  <span>{twitter}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <p className="text-slate-400">Not linked</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
