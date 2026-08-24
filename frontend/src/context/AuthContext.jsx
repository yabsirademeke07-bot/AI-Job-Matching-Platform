import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';

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
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(false);

  const login = async ({ email, password }) => {
    setLoading(true);
    try {
      const { data } = await api.post('/login', { email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const setSession = (session) => {
    if (session?.token) {
      localStorage.setItem('token', session.token);
      setToken(session.token);
    }
    if (session?.user) {
      localStorage.setItem('user', JSON.stringify(session.user));
      setUser(session.user);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('job_matching_auth_user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setToken(null);
    setUser(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.location.replace('/register');
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