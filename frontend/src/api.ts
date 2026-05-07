import axios from 'axios';

const getApiUrl = () => {
  // Use the environment variable VITE_API_URL if defined, 
  // otherwise fallback to '/api' for local development proxy.
  const url = import.meta.env.VITE_API_URL || '/api';
  console.log('API Base URL:', url);
  return url;
};

export const API_URL = getApiUrl();

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
