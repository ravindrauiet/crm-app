import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  shops: [],
  currentShop: null,
  nearbyShops: [],
  isLoading: false,
  error: null,
  filters: {
    services: [],
    rating: null,
    distance: null,
    searchQuery: ''
  },
  stats: {
    totalRepairs: 0,
    completedRepairs: 0,
    pendingRepairs: 0,
    averageRating: 0,
    revenue: {
      daily: 0,
      weekly: 0,
      monthly: 0
    }
  }
};

export const shopSlice = createSlice({
  name: 'shops',
  initialState,
  reducers: {
    setShops: (state, action) => {
      state.shops = action.payload;
    },
    setCurrentShop: (state, action) => {
      state.currentShop = action.payload;
    },
    setNearbyShops: (state, action) => {
      state.nearbyShops = action.payload;
    },
    addShop: (state, action) => {
      state.shops.push(action.payload);
    },
    updateShop: (state, action) => {
      const index = state.shops.findIndex(shop => shop.id === action.payload.id);
      if (index !== -1) {
        state.shops[index] = { ...state.shops[index], ...action.payload };
      }
    },
    deleteShop: (state, action) => {
      state.shops = state.shops.filter(shop => shop.id !== action.payload);
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
    updateStats: (state, action) => {
      state.stats = { ...state.stats, ...action.payload };
    },
    resetStats: (state) => {
      state.stats = initialState.stats;
    }
  }
});

export const {
  setShops,
  setCurrentShop,
  setNearbyShops,
  addShop,
  updateShop,
  deleteShop,
  setLoading,
  setError,
  setFilters,
  clearFilters,
  updateStats,
  resetStats
} = shopSlice.actions;

export default shopSlice.reducer; 