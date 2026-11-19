import axios from 'axios';

const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) return process.env.NEXT_PUBLIC_API_BASE_URL;
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/meetly')) {
    return '/meetly/api/v1';
  }
  return '/api/v1';
};

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});
api.interceptors.request.use((config) => {
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    if (config.headers) {
      delete config.headers['Content-Type'];
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
