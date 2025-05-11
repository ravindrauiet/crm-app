import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import shopsReducer from './slices/shopsSlice';
import shopReducer from './slices/shopSlice';
import repairReducer from './slices/repairSlice';
import inventoryReducer from './slices/inventorySlice';

// Check which shop reducer is being used
console.log('Store configuration:');
console.log('- shopReducer:', shopReducer);
console.log('- shopsReducer:', shopsReducer);

// For development, we'll disable serialization checks completely
// For production, you should use a more targeted approach
const isProduction = process.env.NODE_ENV === 'production';

const store = configureStore({
  reducer: {
    auth: authReducer,
    shops: shopReducer, // Make sure this matches the selector in ShopListScreen
    repair: repairReducer,
    inventory: inventoryReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: isProduction ? {
        // In production, use targeted ignores
        ignoredActions: [
          'auth/register/fulfilled', 
          'auth/login/fulfilled', 
          'inventory/fetchInventory/fulfilled',
          'inventory/fetchAuditLogs/fulfilled',
        ],
        ignoredActionPaths: [
          'payload.createdAt', 
          'payload.updatedAt', 
          'meta.arg',
          'payload.timestamp',
          'meta.baseQueryMeta',
          'meta.requestId',
        ],
        ignoredPaths: [
          'auth.user.createdAt', 
          'auth.user.updatedAt',
          'inventory.items',
          'inventory.auditLogs',
        ],
      } : false, // In development, disable checks completely
    }),
  devTools: !isProduction,
});

export default store; 