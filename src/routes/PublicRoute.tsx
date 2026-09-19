import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { PageLoader } from '@/components/common/LoadingSpinner';
import { ROUTES } from '@/utils/constants';

/**
 * Route guard for public auth routes (/login, /register, /forgot-password).
 * 1. Shows PageLoader ONLY while Firebase Auth resolves initial session on page load.
 * 2. Redirects authenticated users from /login and /forgot-password to /dashboard.
 * 3. On /register, allows RegisterPage to manage its own registration lifecycle and error display.
 */
export const PublicRoute: React.FC = () => {
  const { isAuthenticated, initialLoading } = useAuth();
  const location = useLocation();

  if (initialLoading) {
    return <PageLoader message="Connecting to TalentBay Recruiter..." />;
  }

  // Redirect to dashboard if already authenticated when visiting login or root,
  // but allow RegisterPage to remain mounted to display duplicate-account validation and errors
  if (isAuthenticated && location.pathname !== ROUTES.REGISTER) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return <Outlet />;
};
