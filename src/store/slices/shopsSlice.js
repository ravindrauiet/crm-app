import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getShops, getShopById } from '../../services/firebaseService';

const initialState = {
  shops: [],
  selectedShop: null,
  isLoading: false,
  error: null,
};

export const fetchShops = createAsyncThunk(
  'shops/fetchShops',
  async (_, { rejectWithValue }) => {
    try {
      const shops = await getShops();
      return shops;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchShopById = createAsyncThunk(
  'shops/fetchShopById',
  async (shopId, { rejectWithValue }) => {
    try {
      const shop = await getShopById(shopId);
      return shop;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const shopsSlice = createSlice({
  name: 'shops',
  initialState,
  reducers: {
    clearSelectedShop: (state) => {
      state.selectedShop = null;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Shops
      .addCase(fetchShops.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchShops.fulfilled, (state, action) => {
        state.isLoading = false;
        state.shops = action.payload;
      })
      .addCase(fetchShops.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch Shop by ID
      .addCase(fetchShopById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchShopById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedShop = action.payload;
      })
      .addCase(fetchShopById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearSelectedShop, clearError } = shopsSlice.actions;
export default shopsSlice.reducer; 