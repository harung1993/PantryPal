import axios from 'axios';

const DEFAULT_API_URL = 'http://localhost';

// Get API URL from localStorage or use default
const getApiBaseUrl = () => {
  return localStorage.getItem('API_BASE_URL') || DEFAULT_API_URL;
};

// Get API key from localStorage
const getApiKey = () => {
  return localStorage.getItem('API_KEY') || null;
};

// Set API key in localStorage
export const setApiKey = (apiKey) => {
  if (apiKey && apiKey.trim()) {
    localStorage.setItem('API_KEY', apiKey.trim());
  } else {
    localStorage.removeItem('API_KEY');
  }
};

// Remove API key
export const removeApiKey = () => {
  localStorage.removeItem('API_KEY');
};

// Create axios instance with dynamic base URL and API key
const createApiInstance = () => {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  // Add API key header if available
  const apiKey = getApiKey();
  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }
  
  const instance = axios.create({
    baseURL: getApiBaseUrl(),
    timeout: 10000,
    headers,
    withCredentials: true,  // Important! Include cookies (session token)
  });

  // Add response interceptor to handle 401 errors
  // Note: We don't show alerts here - let the component handle auth errors
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response && error.response.status === 401) {
        // API key or session missing/invalid
        const message = error.response.data?.detail || 'Authentication required';
        console.error('Authentication error:', message);
        
        // Clear invalid credentials silently
        if (getApiKey()) {
          removeApiKey();
        }
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

// Check authentication status
export const checkAuthStatus = async () => {
  const api = createApiInstance();
  try {
    const response = await api.get('/api/auth/status');
    return response.data;
  } catch (error) {
    console.error('Failed to check auth status:', error);
    return { auth_mode: 'unknown', requires_api_key: false };
  }
};

export const getItems = async (location = null, search = null) => {
  const api = createApiInstance();
  const params = {};
  if (location) params.location = location;
  if (search) params.search = search;
  const response = await api.get('/api/items', { params });
  return response.data;
};

export const addItemManual = async (itemData) => {
  const api = createApiInstance();
  const response = await api.post('/api/items/manual', itemData);
  return response.data;
};

export const updateItem = async (itemId, updates) => {
  const api = createApiInstance();
  const response = await api.put(`/api/items/${itemId}`, updates);
  return response.data;
};

export const deleteItem = async (itemId) => {
  const api = createApiInstance();
  const response = await api.delete(`/api/items/${itemId}`);
  return response.data;
};

export const getStats = async () => {
  const api = createApiInstance();
  const response = await api.get('/api/stats');
  return response.data;
};

export const getLocations = async () => {
  const api = createApiInstance();
  const response = await api.get('/api/locations');
  return response.data;
};

export const getCategories = async () => {
  const api = createApiInstance();
  const response = await api.get('/api/categories');
  return response.data;
};

export default { createApiInstance };