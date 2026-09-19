import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Upload,
  MapPin,
  FileText,
  Share2,
  Plus,
  Trash2,
  Save,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { companyService } from '@/services/companyService';
import { CompanyModel, CompanyOfficeLocation } from '@/types/company';
import { ROUTES } from '@/utils/constants';

const INDUSTRIES = [
  'IT & Services',
  'Software Development',
  'Financial Services',
  'Healthcare',
  'Education',
  'E-Commerce',
  'Retail',
  'Manufacturing',
  'Automotive',
  'Telecommunications',
  'Hospitality',
  'Construction',
  'Real Estate',
  'Marketing',
  'Consulting',
  'Design',
  'Media',
  'Others',
];

const COMPANY_SIZES = [
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '501-1000',
  '1000+',
];

export const EditCompanyPage: React.FC = () => {
  const { recruiterProfile } = useAuth();
  const navigate = useNavigate();

  const [company, setCompany] = useState<CompanyModel | null>(null);
  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form State
  const [companyName, setCompanyName] = useState('');
  const [tagline, setTagline] = useState('');
  const [about, setAbout] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [foundedYear, setFoundedYear] = useState<number | ''>('');

  // Contact & Address
  const [officialEmail, setOfficialEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('India');
  const [postalCode, setPostalCode] = useState('');

  // Additional Offices
  const [additionalOffices, setAdditionalOffices] = useState<CompanyOfficeLocation[]>([]);
  const [newOfficeCity, setNewOfficeCity] = useState('');
  const [newOfficeState, setNewOfficeState] = useState('');
  const [newOfficeCountry, setNewOfficeCountry] = useState('India');
  const [newOfficeStreet, setNewOfficeStreet] = useState('');
  const [showAddOffice, setShowAddOffice] = useState(false);

  // Business
  const [gstNumber, setGstNumber] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');

  // Social
  const [linkedin, setLinkedin] = useState('');
  const [twitter, setTwitter] = useState('');

  // Logo file
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

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
        if (comp) {
          setCompany(comp);
          setCompanyName(comp.profile?.companyName || '');
          setTagline(comp.profile?.tagline || '');
          setAbout(comp.profile?.about || '');
          const rawInd = comp.profile?.industry || comp.business?.industry || comp.industry || '';
          const isLegacyInd = typeof rawInd === 'string' && rawInd.trim().toLowerCase() === 'technology';
          const cleanInd = isLegacyInd ? '' : (typeof rawInd === 'string' ? rawInd.trim() : '');
          setIndustry(cleanInd);

          const rawSize = comp.profile?.companySize || comp.business?.companySize || comp.business?.size || comp.companySize || '';
          const isLegacySz = typeof rawSize === 'string' && (rawSize.trim() === '11-50' || rawSize.trim().toLowerCase() === '11-50 employees') && isLegacyInd;
          const cleanSz = isLegacySz ? '' : (typeof rawSize === 'string' ? rawSize.trim() : '');
          setCompanySize(cleanSz);

          setFoundedYear(typeof comp.profile?.foundedYear === 'number' ? comp.profile.foundedYear : Number(comp.profile?.foundedYear) || '');


          setOfficialEmail(comp.contact?.officialEmail || '');
          setPhone(comp.contact?.phone || '');
          setStreet(comp.contact?.primaryAddress?.street || '');
          setCity(comp.contact?.primaryAddress?.city || '');
          setState(comp.contact?.primaryAddress?.state || '');
          setCountry(comp.contact?.primaryAddress?.country || 'India');
          setPostalCode(comp.contact?.primaryAddress?.postalCode || '');

          setAdditionalOffices(comp.contact?.additionalOffices || []);

          setGstNumber(comp.business?.gstNumber || '');
          setRegistrationNumber(comp.business?.registrationNumber || '');

          setLinkedin(comp.social?.linkedin || '');
          setTwitter(comp.social?.twitter || '');

          if (comp.profile?.logoUrl) {
            setLogoPreview(comp.profile.logoUrl);
          }
        }
      } catch (err: unknown) {
        console.error('Error loading company:', err);
        setError('Failed to load company profile.');
      } finally {
        setLoading(false);
      }

    };

    loadCompany();
  }, [companyId]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleAddOffice = () => {
    if (!newOfficeCity.trim()) return;
    const newOffice: CompanyOfficeLocation = {
      city: newOfficeCity.trim(),
      state: newOfficeState.trim(),
      country: newOfficeCountry.trim() || 'India',
      street: newOfficeStreet.trim(),
    };
    setAdditionalOffices([...additionalOffices, newOffice]);
    setNewOfficeCity('');
    setNewOfficeState('');
    setNewOfficeStreet('');
    setShowAddOffice(false);
  };

  const handleRemoveOffice = (index: number) => {
    setAdditionalOffices(additionalOffices.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !companyName.trim()) {
      setError('Company Name is required.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      let uploadedLogoUrl = company?.profile?.logoUrl;
      if (logoFile) {
        uploadedLogoUrl = await companyService.uploadCompanyLogo(companyId, logoFile);
      }

      const updatedData: Partial<CompanyModel> = {
        profile: {
          ...company?.profile,
          companyName: companyName.trim(),
          tagline: tagline.trim(),
          about: about.trim(),
          website: website.trim(),
          industry,
          companySize,
          foundedYear: foundedYear === '' ? undefined : Number(foundedYear),
          logoUrl: uploadedLogoUrl,
        },
        contact: {
          ...company?.contact,
          officialEmail: officialEmail.trim(),
          phone: phone.trim(),
          primaryAddress: {
            street: street.trim(),
            city: city.trim(),
            state: state.trim(),
            country: country.trim(),
            postalCode: postalCode.trim(),
          },
          additionalOffices,
        },
        business: {
          ...company?.business,
          industry,
          companySize,
          size: companySize,
          gstNumber: gstNumber.trim(),
          registrationNumber: registrationNumber.trim(),
        },
        social: {
          ...company?.social,
          linkedin: linkedin.trim(),
          twitter: twitter.trim(),
        },
      };

      await companyService.updateCompany(companyId, updatedData);
      setSuccess('Company profile updated successfully!');
      setTimeout(() => {
        navigate(ROUTES.COMPANY);
      }, 1200);
    } catch (err: unknown) {
      console.error('Error updating company:', err);
      setError(err instanceof Error ? err.message : 'Failed to update company profile.');
    } finally {
      setSaving(false);
    }

  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400">
        <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-medium">Loading company details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(ROUTES.COMPANY)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Company Details</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Banner Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-900 text-white font-bold text-2xl flex items-center justify-center ring-4 ring-slate-100 overflow-hidden shrink-0">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  companyName.charAt(0).toUpperCase() || 'C'
                )}
              </div>
              <label className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white cursor-pointer transition">
                <Upload className="w-5 h-5" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Edit Company Profile
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Update verified organization info and contact channels
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-xl transition shadow-xs disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Alerts */}
        {success && (
          <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
            {success}
          </div>
        )}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            {error}
          </div>
        )}

        {/* Section 1: Basic Info */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building2 className="w-4 h-4 text-teal-600" />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Basic Company Info
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Company Name *</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Corporation"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Tagline / Slogan</label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. Innovating the future of enterprise software"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">About Company</label>
              <textarea
                rows={4}
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                placeholder="Detailed description of your company culture, mission, and products..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Website</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://acme.com"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Industry</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              >
                <option value="">Select Industry</option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Company Size</label>
              <select
                value={companySize}
                onChange={(e) => setCompanySize(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              >
                <option value="">Select Size</option>
                {COMPANY_SIZES.map((sz) => (
                  <option key={sz} value={sz}>
                    {sz} employees
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Founded Year</label>
              <input
                type="number"
                value={foundedYear}
                onChange={(e) => setFoundedYear(e.target.value ? Number(e.target.value) : '')}
                placeholder="e.g. 2018"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Contact & Primary Address */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <MapPin className="w-4 h-4 text-teal-600" />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Contact & Primary Office
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Official Contact Email</label>
              <input
                type="email"
                value={officialEmail}
                onChange={(e) => setOfficialEmail(e.target.value)}
                placeholder="contact@company.com"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Official Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Street Address</label>
              <input
                type="text"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="Building name, street, locality"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Bangalore"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">State / Region</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g. Karnataka"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Country</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="India"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Postal / Zip Code</label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="e.g. 560001"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Additional Office Locations */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-teal-600" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Additional Office Locations
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowAddOffice(!showAddOffice)}
              className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-800"
            >
              <Plus className="w-3.5 h-3.5" />
              {showAddOffice ? 'Cancel' : 'Add Office'}
            </button>
          </div>

          {showAddOffice && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
              <h4 className="text-xs font-bold text-slate-800">New Branch / Office</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Street / Building (Optional)"
                  value={newOfficeStreet}
                  onChange={(e) => setNewOfficeStreet(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="City *"
                  value={newOfficeCity}
                  onChange={(e) => setNewOfficeCity(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="State / Region"
                  value={newOfficeState}
                  onChange={(e) => setNewOfficeState(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Country"
                  value={newOfficeCountry}
                  onChange={(e) => setNewOfficeCountry(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <button
                type="button"
                onClick={handleAddOffice}
                className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-black"
              >
                Confirm Add Location
              </button>
            </div>
          )}

          {additionalOffices.length === 0 ? (
            <p className="text-xs text-slate-400 py-2">No additional branch offices added.</p>
          ) : (
            <div className="space-y-2">
              {additionalOffices.map((office, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200"
                >
                  <div className="text-xs">
                    <p className="font-bold text-slate-800">
                      {office.city}, {office.country}
                    </p>
                    {office.street && <p className="text-slate-500">{office.street}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveOffice(idx)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 4: Business Details */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileText className="w-4 h-4 text-teal-600" />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Business & Registration
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">GST / Tax ID</label>
              <input
                type="text"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                placeholder="e.g. 29AAAAA0000A1Z5"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Registration / CIN</label>
              <input
                type="text"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                placeholder="e.g. U72200KA2018PTC111111"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Section 5: Social Links */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Share2 className="w-4 h-4 text-teal-600" />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Social Links
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">LinkedIn URL</label>
              <input
                type="url"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                placeholder="https://linkedin.com/company/acme"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Twitter / X URL</label>
              <input
                type="url"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                placeholder="https://twitter.com/acme"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Bottom Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate(ROUTES.COMPANY)}
            className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-xl transition shadow-xs disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving Changes...' : 'Save Company Profile'}
          </button>
        </div>
      </form>
    </div>
  );
};
