import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Attach the JWT token to every request automatically, if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('kickmac_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;