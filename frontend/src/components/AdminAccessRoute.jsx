import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { resolveUserRole } from '../utils/authSession';

export default function AdminAccessRoute({ children }) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const isAdmin = ['admin', 'super_admin'].includes(resolveUserRole(user));
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}
