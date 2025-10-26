import axios from 'axios';

const DEFAULT_API_URL = 'http://localhost:8000';

// Get API URL from localStorage or use default
const getApiBaseUrl = () => {
  return localStorage.getItem('API_BASE_URL') || DEFAULT_API_URL;
};

// Create axios instance with dynamic base URL
const createApiInstance = () => {
  return axios.create({
    baseURL: getApiBaseUrl(),
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });
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