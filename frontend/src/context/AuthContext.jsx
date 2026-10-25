import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import API from '../services/api';
import { clearActiveSession, normalizePermanentAdmin, persistSession, readStoredUser } from '../utils/authSession';

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

  const login = async ({ email, password }) => {
    const { data } = await API.post('/login', { email, password });
    const session = { token: data.token, user: normalizePermanentAdmin(data.user) };
    persistSession(session);
    setToken(session.token);
    setUser(session.user);
    return session;
  };

  const setSession = useCallback((session) => {
    const normalizedSession = {
      ...session,
      user: normalizePermanentAdmin(session?.user),
    };
    persistSession(normalizedSession);
    if (session?.token) setToken(session.token);
    if (normalizedSession.user) setUser(normalizedSession.user);
  }, []);

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