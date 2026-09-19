export interface CompanyOfficeLocation {
  street?: string;
  city: string;
  state?: string;
  country?: string;
  postalCode?: string;
  name?: string;
}

export interface CompanyAddress {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface CompanyProfile {
  name?: string;
  companyName?: string;
  tagline?: string;
  about?: string;
  description?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  bannerUrl?: string;
  industry?: string;
  companyType?: string;
  companySize?: string;
  website?: string;
  foundedYear?: number | string;
}

export interface CompanyContact {
  email?: string;
  officialEmail?: string;
  phone?: string;
  website?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  primaryAddress?: CompanyAddress;
  additionalOffices?: CompanyOfficeLocation[];
  locations?: string[];
}

export interface CompanyBusiness {
  industry?: string;
  size?: string;
  companySize?: string;
  foundedYear?: number | string;
  type?: string;
  gstNumber?: string;
  registrationNumber?: string;
}

export interface CompanyVerification {
  isVerified: boolean;
  status?: string;
  documents?: string[];
}

export interface CompanySocialLinks {
  linkedin?: string;
  twitter?: string;
  github?: string;
  website?: string;
  facebook?: string;
  instagram?: string;
}

export interface CompanyStats {
  openJobsCount?: number;
  totalHiresCount?: number;
}

export interface CompanySettings {
  notifications?: boolean;
  privacy?: string;
}

export interface CompanyMeta {
  createdBy: string;
  createdAt: unknown;
  updatedAt?: unknown;
  isActive?: boolean;
  isBlocked?: boolean;
}

export interface Company {
  id?: string;
  companyId?: string;
  profile: CompanyProfile;
  contact: CompanyContact;
  business: CompanyBusiness;
  verification: CompanyVerification;
  social: CompanySocialLinks;
  stats?: CompanyStats;
  settings?: CompanySettings;
  meta: CompanyMeta;
  // Backward compatibility convenience accessors
  name?: string;
  companyName?: string;
  website?: string;
  industry?: string;
  companySize?: string;
  size?: string;
  about?: string;
  aboutCompany?: string;
  logoUrl?: string;
  bannerUrl?: string;
  isVerified?: boolean;
}

export type CompanyModel = Company;

