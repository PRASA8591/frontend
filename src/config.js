import axios from 'axios';

// Read backend API URL from environment variable, fallback to localhost:5000
// Normalize URL by removing trailing slash if present
let rawBackendUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';
if (rawBackendUrl.endsWith('/')) {
  rawBackendUrl = rawBackendUrl.slice(0, -1);
}
export const BACKEND_URL = rawBackendUrl;
export const API_URL = `${BACKEND_URL}/api`;

// Register global request interceptor to dynamically replace hardcoded backend url references
axios.interceptors.request.use(
  (config) => {
    if (config.url) {
      // Replace hardcoded localhost base URLs with the configured environment backend URL
      if (config.url.includes('http://127.0.0.1:5000')) {
        config.url = config.url.replace('http://127.0.0.1:5000', BACKEND_URL);
      } else if (config.url.includes('http://localhost:5000')) {
        config.url = config.url.replace('http://localhost:5000', BACKEND_URL);
      }
      // Sanitize potential double slashes in paths (e.g. domain.com//api -> domain.com/api)
      // leaving the protocol (http:// or https://) untouched
      config.url = config.url.replace(/([^:]\/)\/+/g, '$1');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
