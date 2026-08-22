import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

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

  // 2. ተጠቃሚው ካልገባ ወይም Token/User ከሌለ ወደ Login ይመለስ
  if (!token || !user) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // 3. ተጠቃሚው ገብቷል ነገር ግን Role ገና ካልመረጠ ወደ /select-role ይሂድ
  if (!user.role && !user.userType) {
    return <Navigate to="/select-role" state={{ from: location }} replace />;
  }

  // ሮሎችን ወደ አንድ ወጥ አጻጻፍ መቀየሪያ ረዳት ፈንክሽን
  const normalizeRole = (roleStr) => {
    if (!roleStr) return '';
    const clean = roleStr.toString().trim().toLowerCase().replace(/[\s_-]+/g, '');
    if (clean === 'jobseeker' || clean === 'seeker') return 'seeker';
    return clean;
  };

  const rawUserRole = user.role || user.userType || '';
  const userRole = normalizeRole(rawUserRole);

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