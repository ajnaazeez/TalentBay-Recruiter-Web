import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { PageLoader } from '@/components/common/LoadingSpinner';
import { ProtectedRoute } from './ProtectedRoute';
import { PublicRoute } from './PublicRoute';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { JobsPage } from '@/pages/jobs/JobsPage';
import { JobCreatePage } from '@/pages/jobs/JobCreatePage';
import { BulkJobUploadPage } from '@/pages/jobs/BulkJobUploadPage';
import { JobDetailPage } from '@/pages/jobs/JobDetailPage';
import { ClosedJobsPage } from '@/pages/jobs/ClosedJobsPage';
import { CandidatesPage } from '@/pages/candidates/CandidatesPage';
import { CandidateDetailPage } from '@/pages/candidates/CandidateDetailPage';
import { ApplicationsPage } from '@/pages/applications/ApplicationsPage';
import { ChatPage } from '@/pages/chat/ChatPage';
import { NotificationsPage } from '@/pages/notifications/NotificationsPage';
import { ProfilePage } from '@/pages/profile/ProfilePage';
import { CompanyPage } from '@/pages/company/CompanyPage';
import { EditCompanyPage } from '@/pages/company/EditCompanyPage';
import { SubscriptionPage } from '@/pages/subscription/SubscriptionPage';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import { SupportPage } from '@/pages/settings/SupportPage';
import { AboutPage } from '@/pages/settings/AboutPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ROUTES } from '@/utils/constants';

/**
 * Dynamic root redirect:
 * - If Firebase Auth is initializing -> PageLoader
 * - If user is authenticated -> /dashboard
 * - If user is unauthenticated -> /login
 */
const RootRedirect: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <PageLoader message="Connecting to TalentBay Recruiter..." />;
  }

  if (isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return <Navigate to={ROUTES.LOGIN} replace />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Root Dynamic Redirect */}
      <Route path="/" element={<RootRedirect />} />

      {/* Public Auth Routes (Guest Only) */}
      <Route element={<PublicRoute />}>
        <Route element={<AuthLayout />}>
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
          <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
        </Route>
      </Route>

      {/* Recruiter Workspace Protected Routes (Authenticated Only) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
          <Route path={ROUTES.JOBS} element={<JobsPage />} />
          <Route path={ROUTES.JOB_CREATE} element={<JobCreatePage />} />
          <Route path={ROUTES.JOB_BULK_UPLOAD} element={<BulkJobUploadPage />} />
          <Route path="/bulk-upload" element={<BulkJobUploadPage />} />
          <Route path="/jobs/:jobId" element={<JobDetailPage />} />
          <Route path="/jobs/:jobId/edit" element={<JobCreatePage isEditing />} />
          <Route path={ROUTES.CLOSED_JOBS} element={<ClosedJobsPage />} />
          <Route path={ROUTES.CANDIDATES} element={<CandidatesPage />} />
          <Route path="/candidates/:candidateId" element={<CandidateDetailPage />} />
          <Route path={ROUTES.APPLICATIONS} element={<ApplicationsPage />} />
          <Route path={ROUTES.CHAT} element={<ChatPage />} />
          <Route path="/chat/:chatId" element={<ChatPage />} />
          <Route path="/messages" element={<ChatPage />} />
          <Route path="/messages/:chatId" element={<ChatPage />} />
          <Route path={ROUTES.NOTIFICATIONS} element={<NotificationsPage />} />
          <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
          <Route path={ROUTES.COMPANY} element={<CompanyPage />} />
          <Route path={ROUTES.COMPANY_EDIT} element={<EditCompanyPage />} />
          <Route path={ROUTES.SUBSCRIPTION} element={<SubscriptionPage />} />
          <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
          <Route path={ROUTES.SUPPORT} element={<SupportPage />} />
          <Route path={ROUTES.ABOUT} element={<AboutPage />} />
        </Route>
      </Route>

      {/* Catch-all 404 Route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
