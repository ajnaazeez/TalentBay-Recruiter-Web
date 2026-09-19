import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { PageLoader } from '@/components/common/LoadingSpinner';
import { ROUTES } from '@/utils/constants';

/**
 * Route guard for protected recruiter workspace routes.
 * 1. Shows PageLoader while Firebase Auth resolves session.
 * 2. Redirects unauthenticated visitors to /login preserving target location.
 * 3. Renders protected child components when authenticated.
 */
export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, loading, initialLoading } = useAuth();
  const location = useLocation();

  if (loading || initialLoading) {
    return <PageLoader message="Authenticating TalentBay Recruiter..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  return <Outlet />;
};
