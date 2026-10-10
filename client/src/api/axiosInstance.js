import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://localhost:5000',
});

// Attach JWT from localStorage to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global response error handler – never expose raw errors to the UI
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      'Something went wrong. Please try again.';
    return Promise.reject(new Error(message));
  }
);

export default api;
