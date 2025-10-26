
import AsyncStorage from '@react-native-async-storage/async-storage';

// Default fallback
const DEFAULT_API_URL = 'http://192.168.68.119:8000';

let cachedUrl = null;

export const getApiBaseUrl = async () => {
  if (cachedUrl) return cachedUrl;
  
  try {
    const savedUrl = await AsyncStorage.getItem('API_BASE_URL');
    cachedUrl = savedUrl || DEFAULT_API_URL;
    return cachedUrl;
  } catch (error) {
    console.error('Failed to load API URL:', error);
    return DEFAULT_API_URL;
  }
};

export const setApiBaseUrl = async (url) => {
  cachedUrl = url;
  await AsyncStorage.setItem('API_BASE_URL', url);
};

// For initial export (used by api.js)
export const API_BASE_URL = DEFAULT_API_URL;
