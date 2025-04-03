import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';

// Async thunks
export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/notifications`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch notifications');
    }
  }
);

export const markNotificationAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (notificationId, { rejectWithValue }) => {
    try {
      const response = await axios.patch(`${API_URL}/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to mark notification as read');
    }
  }
);

export const markAllNotificationsAsRead = createAsyncThunk(
  'notifications/markAllAsRead',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.patch(`${API_URL}/notifications/read-all`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to mark all notifications as read');
    }
  }
);

const initialState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  systemMessages: [], // For temporary system messages (success/error alerts)
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    // Add a system message (success/error/info alert)
    addSystemMessage: (state, action) => {
      const message = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        ...action.payload
      };
      state.systemMessages.push(message);
    },
    // Remove a system message
    removeSystemMessage: (state, action) => {
      state.systemMessages = state.systemMessages.filter(
        msg => msg.id !== action.payload
      );
    },
    // Clear all system messages
    clearSystemMessages: (state) => {
      state.systemMessages = [];
    },
    // Add a local notification (without API call)
    addLocalNotification: (state, action) => {
      const notification = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        read: false,
        ...action.payload
      };
      state.notifications.unshift(notification);
      state.unreadCount += 1;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Notifications
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.notifications = action.payload.notifications;
        state.unreadCount = action.payload.unreadCount;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Mark as Read
      .addCase(markNotificationAsRead.fulfilled, (state, action) => {
        const notification = state.notifications.find(
          n => n._id === action.payload._id
        );
        if (notification && !notification.read) {
          notification.read = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      // Mark All as Read
      .addCase(markAllNotificationsAsRead.fulfilled, (state) => {
        state.notifications.forEach(notification => {
          notification.read = true;
        });
        state.unreadCount = 0;
      });
  }
});

export const {
  addSystemMessage,
  removeSystemMessage,
  clearSystemMessages,
  addLocalNotification
} = notificationsSlice.actions;

// Selectors
export const selectNotifications = (state) => state.notifications.notifications;
export const selectUnreadCount = (state) => state.notifications.unreadCount;
export const selectSystemMessages = (state) => state.notifications.systemMessages;
export const selectNotificationsLoading = (state) => state.notifications.loading;
export const selectNotificationsError = (state) => state.notifications.error;

// Helper functions to add specific types of system messages
export const showSuccessMessage = (message) => (dispatch) => {
  dispatch(addSystemMessage({
    type: 'success',
    message,
    duration: 5000 // Auto-dismiss after 5 seconds
  }));
};

export const showErrorMessage = (message) => (dispatch) => {
  dispatch(addSystemMessage({
    type: 'error',
    message,
    duration: 7000 // Error messages stay longer
  }));
};

export const showInfoMessage = (message) => (dispatch) => {
  dispatch(addSystemMessage({
    type: 'info',
    message,
    duration: 4000
  }));
};

export const showWarningMessage = (message) => (dispatch) => {
  dispatch(addSystemMessage({
    type: 'warning',
    message,
    duration: 6000
  }));
};

export default notificationsSlice.reducer;