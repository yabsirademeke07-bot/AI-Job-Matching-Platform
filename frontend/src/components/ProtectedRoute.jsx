import { Navigate, useLocation } from 'react-router-dom';
import { normalizeRole, resolveUserRole } from '../utils/authSession';

const ProtectedRoute = ({ 
  children, 
  allowedRoles = [], 
  fallbackPath = '/login', 
  unauthorizedPath = '/',
  allowUnassigned = false,
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
  const userRole = resolveUserRole(user);
  const isPermanentAdmin = userRole === 'admin' && (
    String(user?.email || '').trim().toLowerCase() === 'yabsirademeke07@gmail.com'
    || String(user?.email || '').trim().toLowerCase() === 'tekebaaweke32@gmail.com'
  );
  const isEmailVerified = user?.isEmailVerified === true || user?.is_verified === true || user?.isVerified === true || isPermanentAdmin;
  const isAdminRoute = location.pathname.startsWith('/admin') || location.pathname === '/admin-dashboard';

  // 2. ተጠቃሚው ካልገባ ወይም Token/User ከሌለ ወደ Login ይመለስ
  if (!token || !user) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // Admins always enter the restricted workspace; other roles cannot enter it.
  if (userRole === 'admin' || userRole === 'super_admin' || isPermanentAdmin) {
    if (!isAdminRoute) return <Navigate to="/admin/dashboard" replace />;
  } else if (isAdminRoute) {
    return <Navigate to="/" replace />;
  }

  if (!isEmailVerified) {
    return <Navigate to="/verify-otp" state={{ email: user.email, from: location }} replace />;
  }

  // 3. ተጠቃሚው ገብቷል ነገር ግን Role ገና ካልመረጠ ወደ /select-role ይሂድ
  if (!allowUnassigned && !user.role && !user.userType) {
    return <Navigate to="/select-role" state={{ from: location }} replace />;
  }

  // Route guard forcing the user away from personal-info based on a generic
  // CV prerequisite assumption has been removed. The CV-skip flag and the
  // backend profile-status route now drive the navigation decision directly.

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