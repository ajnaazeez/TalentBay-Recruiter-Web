import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  Building2,
  Trash2,
  Edit3,
  X,
  AlertTriangle,
  Upload,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/authService';
import { ROUTES } from '@/utils/constants';

export const ProfilePage: React.FC = () => {
  const { user, recruiterProfile, companyProfile, updateRecruiter, isSubscribed, deleteAccount } = useAuth();
  const navigate = useNavigate();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Edit Form state
  const [fullName, setFullName] = useState('');
  const [designation, setDesignation] = useState('');
  const [phone, setPhone] = useState('');

  const handleStartEdit = () => {
    setFullName(recruiterProfile?.fullName || recruiterProfile?.displayName || user?.displayName || '');
    setDesignation(recruiterProfile?.designation || 'Hiring Lead');
    setPhone(recruiterProfile?.phone || recruiterProfile?.phoneNumber || '');
    setIsEditing(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    try {
      setIsSaving(true);
      setError(null);
      await updateRecruiter({
        fullName: fullName.trim(),
        displayName: fullName.trim(),
        designation: designation.trim(),
        phone: phone.trim(),
        phoneNumber: phone.trim(),
      });
      setSuccess('Recruiter profile updated successfully!');
      setIsEditing(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      console.error('Failed to update recruiter:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;
    try {
      setUploadingAvatar(true);
      setError(null);
      const url = await authService.uploadProfilePhoto(user.uid, file);
      await updateRecruiter({ profileImageUrl: url });
      setSuccess('Profile photo updated!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      console.error('Failed to upload photo:', err);
      setError('Failed to upload profile photo.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmText.toUpperCase() !== 'DELETE') return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
      navigate(ROUTES.LOGIN, { replace: true });
    } catch (err: unknown) {
      console.error('Failed to delete account:', err);
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete account. Please try again.');
      setIsDeleting(false);
    }
  };


  const recruiterName =
    recruiterProfile?.fullName || recruiterProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Recruiter';
  const recruiterDesignation = recruiterProfile?.designation || 'Hiring Lead';
  const companyName = companyProfile?.profile?.companyName || 'Workspace';
  const officialEmail = recruiterProfile?.officialEmail || user?.email || 'Not configured';
  const contactPhone = recruiterProfile?.phone || recruiterProfile?.phoneNumber || 'Not configured';

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
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

      {/* Main Profile Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4 sm:gap-5">
          {/* Avatar with upload overlay */}
          <div className="relative group">
            {recruiterProfile?.profileImageUrl ? (
              <img
                src={recruiterProfile.profileImageUrl}
                alt={recruiterName}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border border-slate-200 shadow-xs"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-teal-700 to-slate-800 text-white font-black text-2xl flex items-center justify-center shadow-xs shrink-0">
                {recruiterName.charAt(0).toUpperCase()}
              </div>
            )}
            <label className="absolute inset-0 bg-black/50 rounded-2xl text-white opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition">
              <Upload className="w-4 h-4" />
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={uploadingAvatar}
                className="hidden"
              />
            </label>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {recruiterName}
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200/60">
                Verified Recruiter
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              {recruiterDesignation} • {companyName}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleStartEdit}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition shadow-2xs shrink-0"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Edit Profile</span>
        </button>
      </div>

      {/* Grid: Account Details & Company Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Information */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <User className="w-4 h-4 text-teal-600" />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Contact Details
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5 font-medium flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" /> Official Work Email
              </span>
              <p className="font-bold text-slate-900">{officialEmail}</p>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5 font-medium flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" /> Phone Number
              </span>
              <p className="font-bold text-slate-900">{contactPhone}</p>
            </div>
          </div>
        </div>

        {/* Linked Organization & Subscription */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-600" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Workspace & Subscription
              </h2>
            </div>
            <button
              onClick={() => navigate(ROUTES.SUBSCRIPTION)}
              className="text-xs font-bold text-teal-700 hover:underline inline-flex items-center gap-0.5"
            >
              Plans &rarr;
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5 font-medium">Organization</span>
              <p className="font-bold text-slate-900">{companyName}</p>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5 font-medium">Subscription Status</span>
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
                  isSubscribed
                    ? 'bg-teal-50 text-teal-700 border-teal-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {isSubscribed ? 'Active Premium' : 'Subscription Required'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone: Delete Account */}
      <div className="bg-rose-50/50 border border-rose-200 rounded-3xl p-6 sm:p-7 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-rose-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Delete Recruiter Account
            </h3>
            <p className="text-xs text-rose-700 max-w-xl leading-relaxed">
              Permanently purge your recruiter profile, authentication records, and company access via verified Firebase Cloud Function.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 text-xs font-bold text-rose-700 hover:text-white bg-rose-100 hover:bg-rose-600 border border-rose-300 rounded-xl transition shrink-0 inline-flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Account
          </button>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Edit Recruiter Profile</h3>
              <button onClick={() => setIsEditing(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Designation / Role</label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition shadow-xs disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">Confirm Account Deletion</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              This action permanently purges your account records and cannot be undone. Type <strong className="text-rose-700">DELETE</strong> to confirm:
            </p>
            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{deleteError}</span>
              </div>
            )}
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-rose-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={confirmText.toUpperCase() !== 'DELETE' || isDeleting}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
