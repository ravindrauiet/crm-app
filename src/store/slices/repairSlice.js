import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  repairs: [],
  currentRepair: null,
  isLoading: false,
  error: null,
  filters: {
    status: 'all', // all, pending, in_progress, completed
    date: null,
    shopId: null
  }
};

export const repairSlice = createSlice({
  name: 'repairs',
  initialState,
  reducers: {
    setRepairs: (state, action) => {
      state.repairs = action.payload;
    },
    setCurrentRepair: (state, action) => {
      state.currentRepair = action.payload;
    },
    addRepair: (state, action) => {
      state.repairs.push(action.payload);
    },
    updateRepair: (state, action) => {
      const index = state.repairs.findIndex(repair => repair.id === action.payload.id);
      if (index !== -1) {
        state.repairs[index] = { ...state.repairs[index], ...action.payload };
      }
    },
    deleteRepair: (state, action) => {
      state.repairs = state.repairs.filter(repair => repair.id !== action.payload);
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
    }
  }
});

export const {
  setRepairs,
  setCurrentRepair,
  addRepair,
  updateRepair,
  deleteRepair,
  setLoading,
  setError,
  setFilters,
  clearFilters
} = repairSlice.actions;

export default repairSlice.reducer; 