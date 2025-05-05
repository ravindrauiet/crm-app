import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import repairReducer from './slices/repairSlice';
import shopReducer from './slices/shopSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    repairs: repairReducer,
    shops: shopReducer,
  },
}); 