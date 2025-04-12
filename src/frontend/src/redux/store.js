import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // defaults to localStorage for web
import authReducer from './slices/authSlice';
import casesReducer from './slices/casesSlice';
import notificationsReducer from './slices/notificationsSlice';
import kanbanReducer from './slices/kanbanSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  cases: casesReducer,
  notifications: notificationsReducer,
  kanban: kanbanReducer
});

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth'] // only auth is persisted
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    })
});

export const persistor = persistStore(store);

// Expose store to window object for axios interceptor
if (process.env.NODE_ENV !== 'production') {
  window.store = store;
} else {
  // In production, expose minimal interface
  window.store = {
    dispatch: store.dispatch
  };
}

export default store;