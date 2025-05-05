import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  USER: 'user',
  REPAIRS: 'repairs',
  SHOPS: 'shops',
};

// Auth functions
export const loginUser = async (email, password) => {
  try {
    // For demo, accept any email/password combination
    const user = {
      uid: email.toLowerCase(),
      email: email.toLowerCase(),
      userType: email.includes('shop') ? 'shop_owner' : 'customer',
    };
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    return user;
  } catch (error) {
    throw new Error('Login failed');
  }
};

export const registerUser = async (email, password, userType, shopDetails = null) => {
  try {
    const user = {
      uid: email.toLowerCase(),
      email: email.toLowerCase(),
      userType,
      createdAt: new Date().toISOString(),
    };

    if (userType === 'shop_owner' && shopDetails) {
      const shop = {
        id: user.uid,
        ...shopDetails,
        ownerId: user.uid,
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      const shops = await getShops();
      shops.push(shop);
      await AsyncStorage.setItem(STORAGE_KEYS.SHOPS, JSON.stringify(shops));
    }

    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    return user;
  } catch (error) {
    throw new Error('Registration failed');
  }
};

export const logoutUser = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.USER);
  } catch (error) {
    throw new Error('Logout failed');
  }
};

export const getCurrentUser = async () => {
  try {
    const userStr = await AsyncStorage.getItem(STORAGE_KEYS.USER);
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    return null;
  }
};

// Repairs functions
export const getRepairs = async () => {
  try {
    const repairsStr = await AsyncStorage.getItem(STORAGE_KEYS.REPAIRS);
    return repairsStr ? JSON.parse(repairsStr) : [];
  } catch (error) {
    return [];
  }
};

export const addRepair = async (repair) => {
  try {
    const repairs = await getRepairs();
    const newRepair = {
      id: Date.now().toString(),
      ...repair,
      createdAt: new Date().toISOString(),
    };
    repairs.push(newRepair);
    await AsyncStorage.setItem(STORAGE_KEYS.REPAIRS, JSON.stringify(repairs));
    return newRepair;
  } catch (error) {
    throw new Error('Failed to add repair');
  }
};

export const updateRepair = async (repairId, updates) => {
  try {
    const repairs = await getRepairs();
    const index = repairs.findIndex(r => r.id === repairId);
    if (index !== -1) {
      repairs[index] = { ...repairs[index], ...updates };
      await AsyncStorage.setItem(STORAGE_KEYS.REPAIRS, JSON.stringify(repairs));
      return repairs[index];
    }
    throw new Error('Repair not found');
  } catch (error) {
    throw new Error('Failed to update repair');
  }
};

// Shops functions
export const getShops = async () => {
  try {
    const shopsStr = await AsyncStorage.getItem(STORAGE_KEYS.SHOPS);
    return shopsStr ? JSON.parse(shopsStr) : [];
  } catch (error) {
    return [];
  }
};

export const getShopById = async (shopId) => {
  try {
    const shops = await getShops();
    return shops.find(shop => shop.id === shopId);
  } catch (error) {
    return null;
  }
};

// Helper function to clear all data (for testing)
export const clearAllData = async () => {
  try {
    await AsyncStorage.clear();
  } catch (error) {
    console.error('Failed to clear data:', error);
  }
}; 