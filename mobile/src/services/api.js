import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrl } from '../../config';

let apiInstance = null;

const getApi = async () => {
  if (!apiInstance) {
    const baseURL = await getApiBaseUrl();
    
    // Get stored API key
    const apiKey = await AsyncStorage.getItem('API_KEY');
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    // Add API key header if available
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }
    
    apiInstance = axios.create({
      baseURL,
      timeout: 10000,
      headers,
    });

    // Add response interceptor to handle 401 errors
    apiInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response && error.response.status === 401) {
          // API key missing or invalid
          const message = error.response.data?.detail || 'Authentication required';
          
          // You could show an alert here or handle it in the UI
          console.error('Authentication error:', message);
          
          // Clear invalid API key
          if (apiKey) {
            await AsyncStorage.removeItem('API_KEY');
            apiInstance = null; // Reset instance
          }
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

export const lookupBarcode = async (barcode) => {
  const api = await getApi();
  const response = await api.get(`/api/lookup/${barcode}`);
  return response.data;
};

export const addItem = async (barcode, location = 'Basement Pantry', quantity = 1, expiryDate = null) => {
  const api = await getApi();
  const response = await api.post('/api/items', {
    barcode,
    location,
    quantity,
    expiry_date: expiryDate,
  });
  return response.data;
};

export const addItemManual = async (itemData) => {
  const api = await getApi();
  const response = await api.post('/api/items/manual', itemData);
  return response.data;
};

export const getItems = async (location = null, search = null) => {
  const api = await getApi();
  const params = {};
  if (location) params.location = location;
  if (search) params.search = search;
  const response = await api.get('/api/items', { params });
  return response.data;
};

export const deleteItem = async (itemId) => {
  const api = await getApi();
  const response = await api.delete(`/api/items/${itemId}`);
  return response.data;
};

export const updateItem = async (itemId, updates) => {
  const api = await getApi();
  const response = await api.put(`/api/items/${itemId}`, updates);
  return response.data;
};

export const getLocations = async () => {
  const api = await getApi();
  const response = await api.get('/api/locations');
  return response.data;
};

export default { getApi };