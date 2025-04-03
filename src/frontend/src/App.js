import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useSelector, useDispatch } from 'react-redux';
import { fetchCurrentUser } from './redux/slices/authSlice';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';

// Client Pages
import ClientDashboard from './pages/client/Dashboard';
import NewCase from './pages/client/NewCase';
import MyCases from './pages/client/MyCases';
import CaseDetails from './pages/client/CaseDetails';

// Solicitor Pages
import SolicitorDashboard from './pages/solicitor/Dashboard';
import AvailableCases from './pages/solicitor/AvailableCases';
import MyCaseload from './pages/solicitor/MyCaseload';
import CaseManagement from './pages/solicitor/CaseManagement';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import UserManagement from './pages/admin/UserManagement';
import CaseOverview from './pages/admin/CaseOverview';
import AdminCaseDetails from './pages/admin/CaseDetails';
import Reports from './pages/admin/Reports';

// Theme configuration
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
});

// Loading component
const LoadingScreen = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    Loading...
  </div>
);

// Root Route Component
const RootRedirect = () => {
  const { isAuthenticated, user, loading } = useSelector(state => state.auth);
  
  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  switch (user.role) {
    case 'client':
      return <Navigate to="/client" replace />;
    case 'solicitor':
      return <Navigate to="/solicitor" replace />;
    case 'admin':
      return <Navigate to="/admin" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useSelector(state => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchCurrentUser());
  }, [dispatch]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          {/* Auth Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Route>

          {/* Main App Routes */}
          <Route element={<MainLayout />}>
            {/* Client Routes */}
            <Route
              path="/client"
              element={
                <ProtectedRoute allowedRoles={['client']}>
                  <ClientDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/client/new-case"
              element={
                <ProtectedRoute allowedRoles={['client']}>
                  <NewCase />
                </ProtectedRoute>
              }
            />
            <Route
              path="/client/cases"
              element={
                <ProtectedRoute allowedRoles={['client']}>
                  <MyCases />
                </ProtectedRoute>
              }
            />
            <Route
              path="/client/cases/:id"
              element={
                <ProtectedRoute allowedRoles={['client']}>
                  <CaseDetails />
                </ProtectedRoute>
              }
            />

            {/* Solicitor Routes */}
            <Route
              path="/solicitor"
              element={
                <ProtectedRoute allowedRoles={['solicitor']}>
                  <SolicitorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/solicitor/available-cases"
              element={
                <ProtectedRoute allowedRoles={['solicitor']}>
                  <AvailableCases />
                </ProtectedRoute>
              }
            />
            <Route
              path="/solicitor/my-cases"
              element={
                <ProtectedRoute allowedRoles={['solicitor']}>
                  <MyCaseload />
                </ProtectedRoute>
              }
            />
            <Route
              path="/solicitor/cases/:id"
              element={
                <ProtectedRoute allowedRoles={['solicitor']}>
                  <CaseManagement />
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/cases"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <CaseOverview />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/cases/:id"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminCaseDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Reports />
                </ProtectedRoute>
              }
            />

            {/* Default Route */}
            <Route
              path="/"
              element={<RootRedirect />}
            />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;