import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp,
  addDoc,
  updateDoc,
  enableNetwork,
  disableNetwork
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';

// Helper function to handle Firestore operations with retry
const withRetry = async (operation, maxRetries = 3) => {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (error.code === 'failed-precondition' || error.code === 'unavailable') {
        // Try to reconnect
        await enableNetwork(db);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};

// Helper function to convert Firestore data to serializable format
const convertToSerializable = (data) => {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;
  if (data instanceof Date) return data.toISOString();
  if (Array.isArray(data)) return data.map(convertToSerializable);
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, convertToSerializable(value)])
  );
};

// Auth functions
export const registerUser = async (email, password, userType, shopDetails = null) => {
  try {
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create user document in Firestore
    const userData = {
      uid: user.uid,
      email: user.email,
      userType,
      createdAt: serverTimestamp(),
    };

    // If user is a shop owner, create shop document
    if (userType === 'shop_owner' && shopDetails) {
      const shopData = {
        ownerId: user.uid,
        ...shopDetails,
        status: 'active',
        rating: 0,
        totalRatings: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Create shop document in shops collection
      await withRetry(() => setDoc(doc(db, 'shops', user.uid), shopData));
    }

    // Create user document in users collection
    await withRetry(() => setDoc(doc(db, 'users', user.uid), userData));

    return {
      uid: user.uid,
      email: user.email,
      userType,
      ...(userType === 'shop_owner' && shopDetails ? { shopDetails } : {})
    };
  } catch (error) {
    console.error('Registration error:', error);
    throw new Error(error.message);
  }
};

export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Get user data from Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      throw new Error('User data not found');
    }

    const userData = userDoc.data();

    // If user is a shop owner, get shop details
    if (userData.userType === 'shop_owner') {
      const shopDoc = await getDoc(doc(db, 'shops', user.uid));
      if (shopDoc.exists()) {
        userData.shopDetails = shopDoc.data();
      }
    }

    return convertToSerializable(userData);
  } catch (error) {
    console.error('Login error:', error);
    throw new Error(error.message);
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout error:', error);
    throw new Error(error.message);
  }
};

export const getCurrentUser = () => {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      if (user) {
        try {
          const userDoc = await withRetry(() => getDoc(doc(db, 'users', user.uid)));
          if (userDoc.exists()) {
            resolve(convertToSerializable(userDoc.data()));
          } else {
            resolve(null);
          }
        } catch (error) {
          console.error('Get current user error:', error);
          reject(error);
        }
      } else {
        resolve(null);
      }
    });
  });
};

// Repairs functions
export const addRepair = async (repair) => {
  try {
    const repairData = {
      ...repair,
      createdAt: new Date().toISOString(),
    };
    
    const repairRef = await withRetry(() => addDoc(collection(db, 'repairs'), {
      ...repairData,
      createdAt: serverTimestamp(),
    }));
    
    return { id: repairRef.id, ...repairData };
  } catch (error) {
    console.error('Add repair error:', error);
    throw new Error('Failed to add repair');
  }
};

export const updateRepair = async (repairId, updates) => {
  try {
    const repairRef = doc(db, 'repairs', repairId);
    const updateData = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    await withRetry(() => updateDoc(repairRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    }));
    
    return { id: repairId, ...updateData };
  } catch (error) {
    console.error('Update repair error:', error);
    throw new Error('Failed to update repair');
  }
};

export const getRepairs = async (userId, userType) => {
  try {
    const repairsRef = collection(db, 'repairs');
    const q = query(
      repairsRef,
      where(userType === 'customer' ? 'customerId' : 'shopId', '==', userId)
    );
    const querySnapshot = await withRetry(() => getDocs(q));
    return querySnapshot.docs.map(doc => convertToSerializable({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Get repairs error:', error);
    throw new Error('Failed to get repairs');
  }
};

// Shops functions
export const getShops = async () => {
  try {
    console.log('Fetching shops from Firebase...');
    // Query users who are shop owners
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('userType', '==', 'shop_owner'));
    const querySnapshot = await withRetry(() => getDocs(q));
    
    console.log(`Found ${querySnapshot.size} shop owners`);
    
    // For each shop owner, fetch their shop details
    const shopOwners = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Get shop details for each shop owner
    const shopsWithDetails = await Promise.all(
      shopOwners.map(async (owner) => {
        try {
          console.log(`Fetching shop details for owner: ${owner.id}`);
          const shopDoc = await withRetry(() => getDoc(doc(db, 'shops', owner.id)));
          if (shopDoc.exists()) {
            // Combine user data with shop data
            const shopData = shopDoc.data();
            console.log(`Shop data found:`, shopData);
            
            // Make sure required fields exist
            if (!shopData.name || !shopData.address) {
              console.warn(`Shop ${owner.id} missing required fields`);
            }
            
            if (!Array.isArray(shopData.services)) {
              console.warn(`Shop ${owner.id} has invalid services:`, shopData.services);
              // Provide default services if missing
              shopData.services = shopData.services ? [shopData.services] : ['General Repair'];
            }
            
            const combinedData = {
              id: owner.id,
              email: owner.email,
              ...shopData,
            };
            
            return convertToSerializable(combinedData);
          } else {
            console.warn(`No shop document found for owner: ${owner.id}`);
          }
          return null;
        } catch (error) {
          console.error(`Error fetching shop details for ${owner.id}:`, error);
          return null;
        }
      })
    );
    
    // Filter out null values (shop owners without shop details)
    const validShops = shopsWithDetails.filter(shop => shop !== null);
    console.log(`Returning ${validShops.length} valid shops`);
    return validShops;
  } catch (error) {
    console.error('Get shops error:', error);
    throw new Error('Failed to get shops');
  }
};

export const getShopById = async (shopId) => {
  try {
    // Get user doc first
    const userDoc = await withRetry(() => getDoc(doc(db, 'users', shopId)));
    if (!userDoc.exists()) {
      return null;
    }
    
    const userData = userDoc.data();
    
    // If user is a shop owner, get shop details
    if (userData.userType === 'shop_owner') {
      const shopDoc = await withRetry(() => getDoc(doc(db, 'shops', shopId)));
      if (shopDoc.exists()) {
        // Combine user data with shop data
        return convertToSerializable({
          id: shopId,
          email: userData.email,
          ...shopDoc.data()
        });
      }
    }
    
    // Return null if no shop data found
    return null;
  } catch (error) {
    console.error('Get shop error:', error);
    throw new Error('Failed to get shop');
  }
}; 