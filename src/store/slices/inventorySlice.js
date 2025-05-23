import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { db } from '../../config/firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc, 
  query, 
  where,
  Timestamp,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';

// Initial state
const initialState = {
  items: [],
  auditLogs: [],
  loading: false,
  error: null,
  status: 'idle',
};

// Helper function to convert all Firestore timestamps to Date strings
const convertTimestamps = (obj) => {
  if (!obj) return obj;
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => convertTimestamps(item));
  }
  
  // Handle objects
  if (typeof obj === 'object') {
    // Check if it's a Firestore Timestamp
    if (obj && typeof obj.toDate === 'function') {
      return obj.toDate().toISOString();
    }
    
    // Process regular objects
    const result = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = convertTimestamps(obj[key]);
      }
    }
    return result;
  }
  
  // Return primitives as is
  return obj;
};

// Async thunks
export const fetchInventory = createAsyncThunk(
  'inventory/fetchInventory',
  async (_, { rejectWithValue }) => {
    try {
      console.log('Fetching inventory items...');
      const inventoryRef = collection(db, 'inventory');
      const querySnapshot = await getDocs(query(inventoryRef, orderBy('name')));
      console.log(`Found ${querySnapshot.docs.length} inventory items`);
      
      const items = querySnapshot.docs.map(doc => {
        const data = doc.data();
        // Convert all timestamps in the object
        return {
          id: doc.id,
          ...convertTimestamps(data)
        };
      });
      
      console.log('Processed inventory items:', items.length);
      return items;
    } catch (error) {
      console.error('Error fetching inventory:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const fetchAuditLogs = createAsyncThunk(
  'inventory/fetchAuditLogs',
  async (_, { rejectWithValue }) => {
    try {
      const logsRef = collection(db, 'inventoryLogs');
      const querySnapshot = await getDocs(query(logsRef, orderBy('timestamp', 'desc')));
      const logs = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...convertTimestamps(data)
        };
      });
      return logs;
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const addInventoryItem = createAsyncThunk(
  'inventory/addInventoryItem',
  async (itemData, { rejectWithValue }) => {
    try {
      console.log('Adding inventory item with data:', itemData);
      
      // Ensure userId exists
      if (!itemData.userId) {
        throw new Error('User ID is required to add inventory items');
      }
      
      const inventoryRef = collection(db, 'inventory');
      const docRef = await addDoc(inventoryRef, {
        ...itemData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Create audit log
      const logsRef = collection(db, 'inventoryLogs');
      await addDoc(logsRef, {
        itemId: docRef.id,
        itemName: itemData.name,
        action: 'add_item',
        quantityChange: itemData.stockLevel,
        previousQuantity: 0,
        newQuantity: itemData.stockLevel,
        timestamp: serverTimestamp(),
        notes: `Initial stock: ${itemData.stockLevel} units`,
        user: itemData.userId
      });

      return {
        id: docRef.id,
        ...itemData
      };
    } catch (error) {
      console.error('Error adding inventory item:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const updateInventoryItem = createAsyncThunk(
  'inventory/updateInventoryItem',
  async ({ id, data }, { rejectWithValue, getState }) => {
    try {
      const state = getState();
      const existingItem = state.inventory.items.find(item => item.id === id);
      
      if (!existingItem) {
        throw new Error('Item not found');
      }
      
      const itemRef = doc(db, 'inventory', id);
      await updateDoc(itemRef, {
        ...data,
        updatedAt: serverTimestamp()
      });

      return {
        id,
        ...existingItem,
        ...data
      };
    } catch (error) {
      console.error('Error updating inventory item:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const adjustInventory = createAsyncThunk(
  'inventory/adjustInventory',
  async ({ id, quantity, reason, notes, userId }, { rejectWithValue, getState }) => {
    try {
      if (!userId) {
        console.error('User ID is missing for adjustInventory');
        throw new Error('User ID is required to adjust inventory');
      }
      
      if (!id) {
        throw new Error('Item ID is required to adjust inventory');
      }
      
      const state = getState();
      const existingItem = state.inventory.items.find(item => item.id === id);
      
      if (!existingItem) {
        throw new Error('Item not found');
      }
      
      const previousQuantity = existingItem.stockLevel;
      const newQuantity = previousQuantity + quantity;
      
      if (newQuantity < 0) {
        throw new Error('Adjustment would result in negative stock level');
      }
      
      // Update inventory
      const itemRef = doc(db, 'inventory', id);
      await updateDoc(itemRef, {
        stockLevel: newQuantity,
        updatedAt: serverTimestamp()
      });
      
      // Create audit log
      const logsRef = collection(db, 'inventoryLogs');
      await addDoc(logsRef, {
        itemId: id,
        itemName: existingItem.name,
        action: quantity > 0 ? 'stock_increase' : 'stock_decrease',
        quantityChange: quantity,
        previousQuantity,
        newQuantity,
        timestamp: serverTimestamp(),
        reason,
        notes,
        user: userId
      });

      return {
        id,
        ...existingItem,
        stockLevel: newQuantity
      };
    } catch (error) {
      console.error('Error adjusting inventory:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const useParts = createAsyncThunk(
  'inventory/useParts',
  async ({ repairId, parts, userId }, { rejectWithValue, getState }) => {
    try {
      if (!userId) {
        console.error('User ID is missing for useParts');
        throw new Error('User ID is required to use parts in repair');
      }
      
      if (!repairId) {
        throw new Error('Repair ID is required to use parts');
      }
      
      const state = getState();
      
      // Process each part
      for (const part of parts) {
        const existingItem = state.inventory.items.find(item => item.id === part.itemId);
        
        if (!existingItem) {
          throw new Error(`Part ${part.name} not found in inventory`);
        }
        
        if (existingItem.stockLevel < part.quantity) {
          throw new Error(`Insufficient stock for ${part.name}`);
        }
        
        const previousQuantity = existingItem.stockLevel;
        const newQuantity = previousQuantity - part.quantity;
        
        // Update inventory
        const itemRef = doc(db, 'inventory', part.itemId);
        await updateDoc(itemRef, {
          stockLevel: newQuantity,
          updatedAt: serverTimestamp()
        });
        
        // Create audit log
        const logsRef = collection(db, 'inventoryLogs');
        await addDoc(logsRef, {
          itemId: part.itemId,
          itemName: existingItem.name,
          action: 'used_in_repair',
          quantityChange: -part.quantity,
          previousQuantity,
          newQuantity,
          repairId,
          timestamp: serverTimestamp(),
          reason: 'Used in repair',
          notes: `Used ${part.quantity} units in repair #${repairId.substring(0, 8)}`,
          user: userId
        });
      }

      return parts;
    } catch (error) {
      console.error('Error using parts in repair:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const deleteInventoryItem = createAsyncThunk(
  'inventory/deleteInventoryItem',
  async (id, { rejectWithValue, getState }) => {
    try {
      const state = getState();
      const existingItem = state.inventory.items.find(item => item.id === id);
      
      if (!existingItem) {
        throw new Error('Item not found');
      }
      
      await deleteDoc(doc(db, 'inventory', id));
      
      return id;
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      return rejectWithValue(error.message);
    }
  }
);

// Slice
const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    resetStatus: (state) => {
      state.status = 'idle';
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch inventory
      .addCase(fetchInventory.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchInventory.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchInventory.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // Fetch audit logs
      .addCase(fetchAuditLogs.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchAuditLogs.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.auditLogs = action.payload;
      })
      .addCase(fetchAuditLogs.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // Add inventory item
      .addCase(addInventoryItem.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(addInventoryItem.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items.push(action.payload);
      })
      .addCase(addInventoryItem.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // Update inventory item
      .addCase(updateInventoryItem.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(updateInventoryItem.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.items.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(updateInventoryItem.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // Adjust inventory
      .addCase(adjustInventory.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(adjustInventory.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.items.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(adjustInventory.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // Use parts in repair
      .addCase(useParts.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(useParts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // The actual updates to the items array happen in the thunk
        // and will be reflected when we refetch inventory
      })
      .addCase(useParts.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // Delete inventory item
      .addCase(deleteInventoryItem.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(deleteInventoryItem.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = state.items.filter(item => item.id !== action.payload);
      })
      .addCase(deleteInventoryItem.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  }
});

export const { resetStatus } = inventorySlice.actions;

// Custom hooks for common selectors
const selectItems = state => state.inventory?.items || [];
const selectStatus = state => ({
  status: state.inventory?.status || 'idle',
  error: state.inventory?.error || null
});
const selectInventoryStore = state => state.inventory || initialState;
const selectAuditLogs = state => state.inventory?.auditLogs || [];

// Memoized selectors
export const useInventory = () => createSelector(
  [selectItems],
  (items) => items
);

export const useInventoryStatus = () => createSelector(
  [selectStatus],
  (status) => status
);

export const useInventoryStore = () => createSelector(
  [selectInventoryStore],
  (store) => store
);

export const useAuditLogs = () => createSelector(
  [selectAuditLogs],
  (logs) => logs
);

export default inventorySlice.reducer; 