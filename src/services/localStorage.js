import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  USER: 'user',
  REPAIRS: 'repairs',
  SHOPS: 'shops',
  USERS: 'users'
};

// Auth functions
export const loginUser = async (email, password) => {
  try {
    // Get all users
    const usersJson = await AsyncStorage.getItem(STORAGE_KEYS.USERS);
    const users = JSON.parse(usersJson || '[]');
    
    // Find user
    const user = users.find(u => u.email === email.toLowerCase());
    if (!user) {
      throw new Error('User not found');
    }

    // Store current user
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    return user;
  } catch (error) {
    throw new Error('Login failed');
  }
};

export const registerUser = async (email, password, userType, shopDetails = null) => {
  try {
    // Get existing users
    const usersJson = await AsyncStorage.getItem(STORAGE_KEYS.USERS);
    const users = JSON.parse(usersJson || '[]');

    // Check if user already exists
    if (users.some(u => u.email === email.toLowerCase())) {
      throw new Error('User already exists');
    }

    const user = {
      id: Date.now().toString(),
      email: email.toLowerCase(),
      userType,
      createdAt: new Date().toISOString(),
    };

    if (userType === 'shop_owner' && shopDetails) {
      user.shopDetails = {
        ...shopDetails,
        ownerId: user.id,
        status: 'active',
        rating: 0,
        totalRatings: 0,
        createdAt: new Date().toISOString(),
      };
    }

    // Add new user to users array
    users.push(user);
    await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    
    // Store current user
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
    const usersJson = await AsyncStorage.getItem(STORAGE_KEYS.USERS);
    const users = JSON.parse(usersJson || '[]');
    
    // Filter shop owners and map their data
    return users
      .filter(user => user.userType === 'shop_owner' && user.shopDetails)
      .map(user => ({
        id: user.id,
        ...user.shopDetails
      }));
  } catch (error) {
    return [];
  }
};

export const getShopById = async (shopId) => {
  try {
    const usersJson = await AsyncStorage.getItem(STORAGE_KEYS.USERS);
    const users = JSON.parse(usersJson || '[]');
    const shopOwner = users.find(u => u.id === shopId && u.userType === 'shop_owner');
    return shopOwner ? { id: shopOwner.id, ...shopOwner.shopDetails } : null;
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