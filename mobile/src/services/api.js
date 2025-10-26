import axios from 'axios';
import { getApiBaseUrl } from '../../config';

let apiInstance = null;

const getApi = async () => {
  if (!apiInstance) {
    const baseURL = await getApiBaseUrl();
    apiInstance = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
  return apiInstance;
};

// Reset API instance when URL changes
export const resetApiInstance = () => {
  apiInstance = null;
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
