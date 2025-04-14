import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  TextField,
  Button,
  Typography,
  Box,
  FormControl,
  FormHelperText,
  InputAdornment,
  IconButton,
  Link,
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  InputLabel
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Lock as LockIcon
} from '@mui/icons-material';
import { login, clearError, fetchCurrentUser } from '../../redux/slices/authSlice';

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated, user } = useSelector(state => state.auth);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: ''
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = React.useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error states only when there are actual errors
    if (validationErrors[name] || error) {
      setValidationErrors(prev => ({ ...prev, [name]: null }));
      dispatch(clearError());
    }
  }, [dispatch, error, validationErrors]);

  const validateForm = React.useCallback(() => {
    const errors = {};

    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    }

    if (!formData.role) {
      errors.role = 'Please select your role';
    }

    // Only update validation errors if they've changed
    setValidationErrors(prev => {
      const isEqual = JSON.stringify(prev) === JSON.stringify(errors);
      return isEqual ? prev : errors;
    });

    return Object.keys(errors).length === 0;
  }, [formData]);

  const handleSubmit = React.useCallback(async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }
    
    console.log('Submitting login form:', formData);

    try {
      const result = await dispatch(login(formData)).unwrap();
      console.log('Login success, result:', result);
      
      // Force auth check after login (might help with race conditions)
      dispatch(fetchCurrentUser());
    } catch (error) {
      console.error('Login unwrap error:', error);
    }
  }, [dispatch, formData, validateForm]);

  // Add a useEffect to check auth state on component mount
  React.useEffect(() => {
    console.log('Login component mounted, auth state:', { 
      isAuthenticated, 
      user: user ? `${user.role}:${user.email}` : 'none',
      hasToken: !!localStorage.getItem('token')
    });
  }, []);

  // Handle navigation after successful login
  React.useEffect(() => {
    if (!isAuthenticated || !user) return;
    
    console.log('Auth state updated - authenticated:', isAuthenticated, 'user:', user);
    
    if (!user.role) {
      console.error('User is missing role property:', user);
      return;
    }

    const paths = {
      client: '/client',
      solicitor: '/solicitor',
      admin: '/admin'
    };

    // Log the navigation attempt for debugging
    const targetPath = paths[user.role] || '/login';
    console.log(`Navigating to ${targetPath} for role ${user.role}`);
    
    // Use a small timeout to ensure state is fully updated
    const timer = setTimeout(() => {
      navigate(targetPath, { replace: true });
    }, 100);
    
    return () => clearTimeout(timer);
  }, [isAuthenticated, user, navigate]);

  // Clear any lingering errors when component unmounts
  React.useEffect(() => {
    return () => {
      if (error) {
        dispatch(clearError());
      }
    };
  }, [dispatch, error]);

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      noValidate
      sx={{
        width: '100%',
        maxWidth: 400
      }}
    >
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Welcome Back
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Sign in to continue to SLLS Legal Clinic
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <FormControl fullWidth margin="normal" error={!!validationErrors.role}>
        <InputLabel>Role</InputLabel>
        <Select
          name="role"
          value={formData.role}
          onChange={handleChange}
          label="Role"
        >
          <MenuItem value="client">Client</MenuItem>
          <MenuItem value="solicitor">Solicitor</MenuItem>
          <MenuItem value="admin">Administrator</MenuItem>
        </Select>
        {validationErrors.role && (
          <FormHelperText>{validationErrors.role}</FormHelperText>
        )}
      </FormControl>

      <TextField
        fullWidth
        margin="normal"
        label="Email Address"
        name="email"
        type="email"
        autoComplete="email"
        value={formData.email}
        onChange={handleChange}
        error={!!validationErrors.email}
        helperText={validationErrors.email}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <EmailIcon color="action" />
            </InputAdornment>
          ),
        }}
      />

      <TextField
        fullWidth
        margin="normal"
        label="Password"
        name="password"
        type={showPassword ? 'text' : 'password'}
        autoComplete="current-password"
        value={formData.password}
        onChange={handleChange}
        error={!!validationErrors.password}
        helperText={validationErrors.password}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <LockIcon color="action" />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={() => setShowPassword(!showPassword)}
                edge="end"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      <Box sx={{ mt: 1, mb: 2, textAlign: 'right' }}>
        <Link
          component={RouterLink}
          to="/forgot-password"
          variant="body2"
          underline="hover"
        >
          Forgot password?
        </Link>
      </Box>

      <Button
        type="submit"
        fullWidth
        variant="contained"
        size="large"
        disabled={loading}
        sx={{ mb: 2 }}
      >
        {loading ? <CircularProgress size={24} /> : 'Sign In'}
      </Button>

      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="body2">
          Don't have an account?{' '}
          <Link
            component={RouterLink}
            to="/register"
            variant="body2"
            underline="hover"
          >
            Sign up here
          </Link>
        </Typography>
      </Box>
    </Box>
  );
};

export default Login;