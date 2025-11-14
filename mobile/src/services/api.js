import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrl } from '../../config';

let apiInstance = null;

const getApi = async () => {
  if (!apiInstance) {
    const baseURL = await getApiBaseUrl();
    
    // Get stored API key and session token
    const apiKey = await AsyncStorage.getItem('API_KEY');
    const sessionToken = await AsyncStorage.getItem('SESSION_TOKEN');
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    // Add API key header if available
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }
    
    // Add session token as Bearer token (not cookie - doesn't work in React Native)
    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }
    
    apiInstance = axios.create({
      baseURL,
      timeout: 10000,
      headers,
      withCredentials: false, // Don't use cookies in React Native
    });

    // Add response interceptor to handle 401 errors
    apiInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response && error.response.status === 401) {
          // API key or session missing/invalid
          const message = error.response.data?.detail || 'Authentication required';
          
          // Only log, don't alert - let the app handle it
          console.log('Auth required:', message);
          
          // Clear invalid credentials silently
          await AsyncStorage.removeItem('API_KEY');
          await AsyncStorage.removeItem('SESSION_TOKEN');
          apiInstance = null; // Reset instance
        }
        return Promise.reject(error);
      }
    );
  }
  return apiInstance;
};

// Reset API instance when URL or API key changes
export const resetApiInstance = () => {
  apiInstance = null;
};

// Set API key and reset instance
export const setApiKey = async (apiKey) => {
  if (apiKey && apiKey.trim()) {
    await AsyncStorage.setItem('API_KEY', apiKey.trim());
  } else {
    await AsyncStorage.removeItem('API_KEY');
  }
  resetApiInstance(); // Force recreation with new key
};

// Get current API key
export const getApiKey = async () => {
  return await AsyncStorage.getItem('API_KEY');
};

// Remove API key
export const removeApiKey = async () => {
  await AsyncStorage.removeItem('API_KEY');
  resetApiInstance();
};

// Check authentication status
export const checkAuthStatus = async () => {
  const api = await getApi();
  try {
    const response = await api.get('/api/auth/status');
    return response.data;
  } catch (error) {
    console.error('Failed to check auth status:', error);
    return { auth_mode: 'unknown', requires_api_key: false };
  }
};

// Helper function for making authenticated requests
const request = async (method, endpoint, data = null) => {
  const api = await getApi();
  const config = { method, url: endpoint };
  if (data) {
    config.data = data;
  }
  const response = await api.request(config);
  return response.data;
};

// Convenience methods
export const get = (endpoint) => request('GET', endpoint);
export const post = (endpoint, data) => request('POST', endpoint, data);
export const put = (endpoint, data) => request('PUT', endpoint, data);
export const patch = (endpoint, data) => request('PATCH', endpoint, data);
export const del = (endpoint) => request('DELETE', endpoint);

// API methods
export const lookupBarcode = async (barcode) => {
  return await get(`/api/lookup/${barcode}`);
};

export const addItem = async (barcode, location = 'Basement Pantry', quantity = 1, expiryDate = null) => {
  return await post('/api/items', {
    barcode,
    location,
    quantity,
    expiry_date: expiryDate,
  });
};

export const addItemManual = async (itemData) => {
  return await post('/api/items/manual', itemData);
};

export const getItems = async (location = null, search = null) => {
  const params = new URLSearchParams();
  if (location) params.append('location', location);
  if (search) params.append('search', search);
  const queryString = params.toString();
  return await get(`/api/items${queryString ? '?' + queryString : ''}`);
};

export const deleteItem = async (itemId) => {
  return await del(`/api/items/${itemId}`);
};

export const updateItem = async (itemId, updates) => {
  return await put(`/api/items/${itemId}`, updates);
};

export const getLocations = async () => {
  return await get('/api/locations');
};

// Export everything
export default {
  getApi,
  resetApiInstance,
  setApiKey,
  getApiKey,
  removeApiKey,
  checkAuthStatus,
  get,
  post,
  put,
  patch,
  delete: del,
  lookupBarcode,
  addItem,
  addItemManual,
  getItems,
  deleteItem,
  updateItem,
  getLocations,
};