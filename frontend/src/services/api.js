import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
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
  (error) => {
    const status = error?.response?.status;

    if (status === 401) {
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default API;