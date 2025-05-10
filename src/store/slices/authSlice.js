import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { 
  loginUser, 
  registerUser, 
  logoutUser, 
  getCurrentUser 
} from '../../services/firebaseService';

const initialState = {
  user: null,
  userType: null, // 'shop_owner' or 'customer'
  isLoading: false,
  error: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const user = await loginUser(email, password);
      return user;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async ({ email, password, userType, userData }, { rejectWithValue }) => {
    try {
      const user = await registerUser(email, password, userType, userData);
      return user;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await logoutUser();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const checkAuth = createAsyncThunk(
  'auth/checkAuth',
  async (_, { rejectWithValue }) => {
    try {
      const user = await getCurrentUser();
      return user;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      state.userType = action.payload.userType;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.userType = action.payload.userType;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Register
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.userType = action.payload.userType;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.userType = null;
      })
      // Check Auth
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.user = action.payload;
        state.userType = action.payload?.userType;
      })
      .addCase(checkAuth.rejected, (state) => {
        state.user = null;
        state.userType = null;
      });
  },
});

export const { setUser, clearError } = authSlice.actions;
export default authSlice.reducer; 