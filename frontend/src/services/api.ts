/**
 * Axios instance configured for communicating with the backend API.
 *
 * @remarks
 * - Uses the base URL from the `REACT_APP_API_URL` environment variable, or defaults to `http://localhost:3001/api`.
 * - Sends requests with `Content-Type: application/json` and credentials included.
 * - Logs all outgoing requests and handles errors globally.
 * - On 401 Unauthorized responses, clears authentication state from local storage but does not redirect automatically.
 *
 * @example
 * ```typescript
 * import api from './services/api';
 * const response = await api.get('/posts');
 * ```
 */
import axios from "axios";

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:3001/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log("API Request:", config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error("API Request Error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error("API Response Error:", error.response?.data || error.message);

    // Handle authentication errors (but don't redirect automatically)
    if (error.response?.status === 401) {
      // Clear any stored auth state
      localStorage.removeItem("isAuthenticated");
      // Don't redirect automatically - let the app handle it
    }

    return Promise.reject(error);
  }
);

export default api;
