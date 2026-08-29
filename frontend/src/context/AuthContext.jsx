import { createContext, useContext, useEffect, useState } from 'react';
import { clearActiveSession, getStoredAccounts, getUserDestination, persistSession, readStoredUser } from '../utils/authSession';

const AuthContext = createContext({
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  login: async () => null,
  setSession: () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      return readStoredUser();
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(false);

  const login = async ({ email }) => {
    const existingUser = getStoredAccounts().find((account) => account.email === email) || readStoredUser();
    const nextUser = existingUser?.email === email ? existingUser : {
      id: existingUser?.id || `frontend-${Date.now()}`,
      email,
      full_name: existingUser?.full_name || email.split('@')[0],
      role: existingUser?.role || 'job_seeker',
      is_verified: true,
      onboardingComplete: existingUser?.onboardingComplete ?? true,
    };
    const session = { token: existingUser?.token || 'frontend-demo-token', user: nextUser };
    persistSession(session);
    setToken(session.token);
    setUser(session.user);
    return { ...session, destination: getUserDestination(nextUser) };
  };

  const setSession = (session) => {
    persistSession(session);
    if (session?.token) setToken(session.token);
    if (session?.user) setUser(session.user);
  };

  const logout = () => {
    clearActiveSession();
    setToken(null);
    setUser(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isAuthenticated = Boolean(token);

  useEffect(() => {
    if (token && !user) {
      // Optional: refresh user data
    }
  }, [token, user]);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, loading, login, setSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);