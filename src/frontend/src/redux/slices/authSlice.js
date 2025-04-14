import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../utils/axios';

// Note: API base URL is handled by axios instance

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      console.log('Login attempt with:', { email: credentials.email, role: credentials.role });
      const response = await axiosInstance.post('/auth/login', credentials);
      
      // Log the entire response structure for debugging
      console.log('Login response structure:', JSON.stringify(response.data, null, 2));
      
      // Store token in localStorage
      localStorage.setItem('token', response.data.token);
      
      // Instead of rejecting, let's fix the data structure if needed
      const responseData = {
        token: response.data.token,
        user: response.data.user || {}
      };
      
      // Ensure user has a role property
      if (responseData.user && !responseData.user.role && credentials.role) {
        console.log('Adding missing role from credentials:', credentials.role);
        responseData.user.role = credentials.role;
      }
      
      return responseData;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      console.error('Login error:', errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post('/auth/register', userData);
      // Store token in localStorage
      localStorage.setItem('token', response.data.token);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Registration failed');
    }
  }
);

export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found');
      const response = await axiosInstance.get('/auth/me');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch user data');
    }
  }
);

const initialState = {
  isAuthenticated: false,
  user: null,
  token: localStorage.getItem('token'),
  loading: false,
  error: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.error = null;
      localStorage.removeItem('token');
    },
    clearError: (state) => {
      state.error = null;
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
    }
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        // Log the payload received from our thunk
        console.log('Login fulfilled payload:', action.payload);
        
        // Skip validation and just use what we have
        const userData = action.payload.user || {};
        const token = action.payload.token;
        
        if (!token) {
          console.error('Missing token in login response');
          state.error = 'Invalid login response: missing token';
          state.loading = false;
          return;
        }
        
        // Set data regardless of complete validation
        localStorage.setItem('token', token);
        state.isAuthenticated = true;
        state.user = userData;
        state.token = token;
        state.loading = false;
        state.error = null;
        
        console.log('Auth state updated:', { 
          isAuthenticated: true,
          user: userData,
          hasToken: !!token
        });
      })
      .addCase(login.rejected, (state, action) => {
        console.error('Login rejected:', action.payload);
        state.loading = false;
        state.error = action.payload || 'Login failed';
      })
      // Register
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        // Ensure token is saved before updating state
        localStorage.setItem('token', action.payload.token);
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.loading = false;
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch Current User
      .addCase(fetchCurrentUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.user = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        localStorage.removeItem('token');
      });
  }
});

export const { logout, clearError, updateUser } = authSlice.actions;

// Selectors
export const selectAuth = (state) => state.auth;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectUser = (state) => state.auth.user;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;

export default authSlice.reducer;