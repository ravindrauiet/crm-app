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

const store = configureStore({
  reducer: {
    auth: authReducer,
    shops: shopReducer, // Make sure this matches the selector in ShopListScreen
    repair: repairReducer,
    inventory: inventoryReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['auth/register/fulfilled', 'auth/login/fulfilled'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.createdAt', 'payload.updatedAt', 'meta.arg'],
        // Ignore these paths in the state
        ignoredPaths: ['auth.user.createdAt', 'auth.user.updatedAt'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

export default store; 