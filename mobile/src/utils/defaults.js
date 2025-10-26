import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_LOCATIONS = ['Basement Pantry', 'Kitchen', 'Fridge', 'Freezer', 'Garage', 'Pantry'];
const DEFAULT_CATEGORIES = ['Beverages', 'Snacks', 'Dairy', 'Canned Goods', 'Frozen', 'Fresh Produce', 'Condiments', 'Breakfast', 'Bakery', 'Meat & Seafood', 'Uncategorized'];

export const getDefaultLocations = async () => {
  try {
    const saved = await AsyncStorage.getItem('DEFAULT_LOCATIONS');
    return saved ? JSON.parse(saved) : DEFAULT_LOCATIONS;
  } catch (error) {
    console.error('Error loading locations:', error);
    return DEFAULT_LOCATIONS;
  }
};

export const getDefaultCategories = async () => {
  try {
    const saved = await AsyncStorage.getItem('DEFAULT_CATEGORIES');
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  } catch (error) {
    console.error('Error loading categories:', error);
    return DEFAULT_CATEGORIES;
  }
};

export const saveDefaultLocations = async (locations) => {
  try {
    await AsyncStorage.setItem('DEFAULT_LOCATIONS', JSON.stringify(locations));
  } catch (error) {
    console.error('Error saving locations:', error);
    throw error;
  }
};

export const saveDefaultCategories = async (categories) => {
  try {
    await AsyncStorage.setItem('DEFAULT_CATEGORIES', JSON.stringify(categories));
  } catch (error) {
    console.error('Error saving categories:', error);
    throw error;
  }
};

export { DEFAULT_LOCATIONS, DEFAULT_CATEGORIES };