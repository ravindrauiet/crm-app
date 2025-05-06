import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { addRepair, updateRepair, getRepairs } from '../../services/firebaseService';

const initialState = {
  repairs: [],
  isLoading: false,
  error: null,
};

export const fetchRepairs = createAsyncThunk(
  'repairs/fetchRepairs',
  async ({ userId, userType }, { rejectWithValue }) => {
    try {
      const repairs = await getRepairs(userId, userType);
      return repairs;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createRepair = createAsyncThunk(
  'repairs/createRepair',
  async (repairData, { rejectWithValue }) => {
    try {
      const repair = await addRepair(repairData);
      return repair;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const editRepair = createAsyncThunk(
  'repairs/editRepair',
  async ({ repairId, repairData }, { rejectWithValue }) => {
    try {
      const repair = await updateRepair(repairId, repairData);
      return repair;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const repairsSlice = createSlice({
  name: 'repairs',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Repairs
      .addCase(fetchRepairs.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchRepairs.fulfilled, (state, action) => {
        state.isLoading = false;
        state.repairs = action.payload;
      })
      .addCase(fetchRepairs.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Create Repair
      .addCase(createRepair.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createRepair.fulfilled, (state, action) => {
        state.isLoading = false;
        state.repairs.push(action.payload);
      })
      .addCase(createRepair.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Edit Repair
      .addCase(editRepair.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(editRepair.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.repairs.findIndex(repair => repair.id === action.payload.id);
        if (index !== -1) {
          state.repairs[index] = action.payload;
        }
      })
      .addCase(editRepair.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError } = repairsSlice.actions;
export default repairsSlice.reducer; 