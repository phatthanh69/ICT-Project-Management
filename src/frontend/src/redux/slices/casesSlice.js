import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';

// Async thunks
export const fetchCases = createAsyncThunk(
  'cases/fetchCases',
  async (filters, { rejectWithValue }) => {
    try {
      const { page = 1, limit = 10, ...otherFilters } = filters || {};
      const queryParams = new URLSearchParams({
        page,
        limit,
        ...otherFilters
      }).toString();
      const response = await axios.get(`${API_URL}/cases?${queryParams}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching cases:', error);
      if (error.response?.status === 401) {
        return rejectWithValue('Please login to view cases');
      }
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch cases. Please try again later.');
    }
  }
);

export const fetchCaseById = createAsyncThunk(
  'cases/fetchCaseById',
  async (caseId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/cases/${caseId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch case');
    }
  }
);

export const createCase = createAsyncThunk(
  'cases/createCase',
  async (caseData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/cases`, caseData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create case');
    }
  }
);

export const updateCase = createAsyncThunk(
  'cases/updateCase',
  async ({ caseId, updates }, { rejectWithValue }) => {
    try {
      const response = await axios.patch(`${API_URL}/cases/${caseId}`, updates);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update case');
    }
  }
);

export const assignCase = createAsyncThunk(
  'cases/assignCase',
  async ({ caseId, solicitorId }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/cases/${caseId}/assign`, {
        solicitorId
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to assign case');
    }
  }
);

export const addCaseNote = createAsyncThunk(
  'cases/addNote',
  async ({ caseId, note }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/cases/${caseId}/notes`, note);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add note');
    }
  }
);

const initialState = {
  cases: [],
  currentCase: null,
  filters: {
    type: '',
    status: '',
    priority: '',
    search: ''
  },
  loading: false,
  error: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalCases: 0
  }
};

const casesSlice = createSlice({
  name: 'cases',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
    clearError: (state) => {
      state.error = null;
    },
    setCurrentPage: (state, action) => {
      state.pagination.currentPage = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Cases
      .addCase(fetchCases.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCases.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        // Handle both paginated and non-paginated responses
        if (Array.isArray(action.payload)) {
          state.cases = action.payload;
          state.pagination = {
            currentPage: 1,
            totalPages: 1,
            totalCases: action.payload.length
          };
        } else {
          state.cases = action.payload.cases;
          state.pagination = {
            currentPage: action.payload.currentPage,
            totalPages: action.payload.totalPages,
            totalCases: action.payload.totalCases
          };
        }
      })
      .addCase(fetchCases.rejected, (state, action) => {
        state.loading = false;
        state.cases = [];
        state.error = action.payload;
      })
      // Fetch Case by ID
      .addCase(fetchCaseById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCaseById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCase = action.payload;
      })
      .addCase(fetchCaseById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create Case
      .addCase(createCase.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCase.fulfilled, (state, action) => {
        state.loading = false;
        state.cases.unshift(action.payload);
      })
      .addCase(createCase.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update Case
      .addCase(updateCase.fulfilled, (state, action) => {
        const index = state.cases.findIndex(c => c._id === action.payload._id);
        if (index !== -1) {
          state.cases[index] = action.payload;
        }
        if (state.currentCase?._id === action.payload._id) {
          state.currentCase = action.payload;
        }
      })
      // Assign Case
      .addCase(assignCase.fulfilled, (state, action) => {
        const index = state.cases.findIndex(c => c._id === action.payload._id);
        if (index !== -1) {
          state.cases[index] = action.payload;
        }
        if (state.currentCase?._id === action.payload._id) {
          state.currentCase = action.payload;
        }
      })
      // Add Note
      .addCase(addCaseNote.fulfilled, (state, action) => {
        if (state.currentCase?._id === action.payload._id) {
          state.currentCase = action.payload;
        }
      });
  }
});

export const {
  setFilters,
  clearFilters,
  clearError,
  setCurrentPage
} = casesSlice.actions;

// Selectors
export const selectCases = (state) => state.cases.cases;
export const selectCurrentCase = (state) => state.cases.currentCase;
export const selectCasesLoading = (state) => state.cases.loading;
export const selectCasesError = (state) => state.cases.error;
export const selectCasesFilters = (state) => state.cases.filters;
export const selectCasesPagination = (state) => state.cases.pagination;

export default casesSlice.reducer;