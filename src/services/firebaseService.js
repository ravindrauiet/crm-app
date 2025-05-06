import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  updateDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
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
  if (!data) return data;
  
  const serialized = { ...data };
  // Convert Firestore timestamps to ISO strings
  if (serialized.createdAt && typeof serialized.createdAt.toDate === 'function') {
    serialized.createdAt = serialized.createdAt.toDate().toISOString();
  }
  if (serialized.updatedAt && typeof serialized.updatedAt.toDate === 'function') {
    serialized.updatedAt = serialized.updatedAt.toDate().toISOString();
  }
  return serialized;
};

// Auth functions
export const registerUser = async (email, password, userType, shopDetails = null) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const userData = {
      uid: user.uid,
      email: user.email,
      userType,
      createdAt: new Date().toISOString(), // Use ISO string instead of serverTimestamp
    };

    if (userType === 'shop_owner' && shopDetails) {
      userData.shopDetails = {
        ...shopDetails,
        ownerId: user.uid,
        status: 'active',
        createdAt: new Date().toISOString(),
      };
    }

    // Use serverTimestamp for Firestore but return serializable data
    await withRetry(() => setDoc(doc(db, 'users', user.uid), {
      ...userData,
      createdAt: serverTimestamp(),
      ...(userData.shopDetails && {
        shopDetails: {
          ...userData.shopDetails,
          createdAt: serverTimestamp()
        }
      })
    }));
    
    return userData; // Return serializable data
  } catch (error) {
    console.error('Registration error:', error);
    throw new Error(error.message);
  }
};

export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    const userDoc = await withRetry(() => getDoc(doc(db, 'users', user.uid)));
    if (!userDoc.exists()) {
      throw new Error('User data not found');
    }
    
    return convertToSerializable(userDoc.data());
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
    const shopsRef = collection(db, 'users');
    const q = query(shopsRef, where('userType', '==', 'shop_owner'));
    const querySnapshot = await withRetry(() => getDocs(q));
    return querySnapshot.docs.map(doc => convertToSerializable({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Get shops error:', error);
    throw new Error('Failed to get shops');
  }
};

export const getShopById = async (shopId) => {
  try {
    const shopDoc = await withRetry(() => getDoc(doc(db, 'users', shopId)));
    if (shopDoc.exists()) {
      return convertToSerializable({
        id: shopDoc.id,
        ...shopDoc.data()
      });
    }
    return null;
  } catch (error) {
    console.error('Get shop error:', error);
    throw new Error('Failed to get shop');
  }
}; 