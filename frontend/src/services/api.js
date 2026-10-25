import axios from 'axios';

const configuredBaseURL = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL;
const getApiBaseURL = (value) => {
  if (!value) return '/api';
  const baseURL = String(value).trim();
  if (baseURL.startsWith('/')) return baseURL.replace(/\/+$/, '') || '/api';

  try {
    const parsedURL = new URL(baseURL);
    if (!['http:', 'https:'].includes(parsedURL.protocol) || !parsedURL.host) throw new Error();
    return baseURL.replace(/\/+$/, '');
  } catch {
    console.error('Invalid VITE_API_URL or VITE_BACKEND_URL. Using the same-origin /api endpoint instead.');
    return '/api';
  }
};

const API = axios.create({
  baseURL: getApiBaseURL(configuredBaseURL),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

API.interceptors.request.use((config) => {
  const token =
    localStorage.getItem('token') || sessionStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export default API;