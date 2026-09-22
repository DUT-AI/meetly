import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') {
      config.baseURL = `${window.location.protocol}//${host}:8000/api/v1`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        const isLoginRequest = error.config?.url?.includes('/auth/login');
        const isLoginPage = window.location.pathname === '/sign-in' || window.location.pathname === '/login';

        // Prevent redirect loop and allow login page to display bad credentials error
        if (!isLoginRequest && !isLoginPage) {
          window.location.href = '/sign-in';
        }
      }
    }
    return Promise.reject(error);
  },
);
