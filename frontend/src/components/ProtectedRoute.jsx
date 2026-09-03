import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getNextOnboardingStep } from '../utils/applicationFlow';
import { normalizeRole } from '../utils/authSession';

const ProtectedRoute = ({ 
  children, 
  allowedRoles = [], 
  fallbackPath = '/login', 
  unauthorizedPath = '/' 
}) => {
  const location = useLocation();

  // 1. Safe localStorage Retrieval (Token እና User)
  const getAuthData = () => {
    try {
      const token = localStorage.getItem('token');
      const userItem = localStorage.getItem('user');
      const user = userItem ? JSON.parse(userItem) : null;
      return { token, user };
    } catch (error) {
      console.error('Failed to parse auth data from localStorage:', error);
      return { token: null, user: null };
    }
  };

  const { token, user } = getAuthData();
  const rawUserRole = user?.role || user?.userType || '';
  const userRole = normalizeRole(rawUserRole);
  const adminOverride = String(user?.email || '').trim().toLowerCase() === 'tekebaaweke32@gmail.com';

  // 2. ተጠቃሚው ካልገባ ወይም Token/User ከሌለ ወደ Login ይመለስ
  if (!token || !user) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // 3. ተጠቃሚው ገብቷል ነገር ግን Role ገና ካልመረጠ ወደ /select-role ይሂድ
  if (!adminOverride && !user.role && !user.userType) {
    return <Navigate to="/select-role" state={{ from: location }} replace />;
  }

  if (adminOverride) {
    return <>{children}</>;
  }

  if (['job_seeker', 'seeker', 'jobseeker', 'user', 'employee'].includes(userRole) && ['/select-role', '/cv-upload', '/seeker/cv-upload', '/upload-cv', '/profile', '/seeker/personal-info', '/dashboard', '/seeker/dashboard'].includes(location.pathname)) {
    const expectedPath = getNextOnboardingStep();
    const expectedPaths = expectedPath === '/seeker/cv-upload' ? ['/seeker/cv-upload', '/cv-upload', '/upload-cv'] : [expectedPath];
    if (!expectedPaths.includes(location.pathname)) {
      return <Navigate to={expectedPath} replace />;
    }
  }

  // 4. allowedRoles ከተሰጠ የነሱን ፍቃድ ማረጋገጥ
  if (allowedRoles && allowedRoles.length > 0) {
    const isAllowed = allowedRoles.some((role) => {
      const normalizedAllowed = normalizeRole(role);
      return normalizedAllowed === userRole;
    });

    // ፍቃድ ከሌለው ወደ unauthorizedPath ይመራል
    if (!isAllowed) {
      console.warn(`Access Denied: User role "${rawUserRole}" (normalized: "${userRole}") is not allowed.`);
      return <Navigate to={unauthorizedPath} replace />;
    }
  }

  return children;
};

export default ProtectedRoute;