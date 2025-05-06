import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import repairsReducer from './slices/repairsSlice';
import shopsReducer from './slices/shopsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    repairs: repairsReducer,
    shops: shopsReducer,
  },
}); 