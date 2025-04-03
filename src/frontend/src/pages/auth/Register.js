import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  TextField,
  Button,
  Typography,
  Box,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  FormHelperText,
  InputAdornment,
  IconButton,
  Link,
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  InputLabel,
  Grid,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon
} from '@mui/icons-material';
import { register, clearError } from '../../redux/slices/authSlice';

const steps = ['Account Type', 'Personal Information', 'Professional Details'];

const Register = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector(state => state.auth);

  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    role: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    // Client specific fields
    address: {
      street: '',
      city: '',
      postcode: ''
    },
    dateOfBirth: '',
    nationalInsuranceNumber: '',
    income: '',
    employmentStatus: '',
    vulnerabilityFactors: [],
    // Solicitor specific fields
    solicitorNumber: '',
    specializations: [],
    firm: {
      name: '',
      address: {
        street: '',
        city: '',
        postcode: ''
      },
      phone: ''
    },
    yearsOfExperience: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }

    if (error) {
      dispatch(clearError());
    }
  };

  const handleNestedChange = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value
      }
    }));
  };

  const validateStep = () => {
    const errors = {};

    switch (activeStep) {
      case 0:
        if (!formData.role) {
          errors.role = 'Please select your role';
        }
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
        if (formData.password !== formData.confirmPassword) {
          errors.confirmPassword = 'Passwords do not match';
        }
        break;

      case 1:
        if (!formData.firstName) errors.firstName = 'First name is required';
        if (!formData.lastName) errors.lastName = 'Last name is required';
        if (!formData.phone) errors.phone = 'Phone number is required';
        break;

      case 2:
        if (formData.role === 'client') {
          if (!formData.address.street) errors['address.street'] = 'Street address is required';
          if (!formData.address.city) errors['address.city'] = 'City is required';
          if (!formData.address.postcode) errors['address.postcode'] = 'Postcode is required';
          if (!formData.dateOfBirth) errors.dateOfBirth = 'Date of birth is required';
          if (!formData.nationalInsuranceNumber) errors.nationalInsuranceNumber = 'NI number is required';
        } else if (formData.role === 'solicitor') {
          if (!formData.solicitorNumber) errors.solicitorNumber = 'Solicitor number is required';
          if (!formData.specializations.length) errors.specializations = 'At least one specialization is required';
          if (!formData.firm.name) errors['firm.name'] = 'Firm name is required';
        }
        break;

      default:
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep()) return;

    try {
      const resultAction = await dispatch(register(formData));
      if (register.fulfilled.match(resultAction)) {
        const role = resultAction.payload.user.role;
        navigate(role === 'client' ? '/client' : '/solicitor');
      }
    } catch (err) {
      console.error('Registration failed:', err);
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <FormControl fullWidth margin="normal" error={!!validationErrors.role}>
              <InputLabel>Account Type</InputLabel>
              <Select
                name="role"
                value={formData.role}
                onChange={handleChange}
                label="Account Type"
              >
                <MenuItem value="client">Client</MenuItem>
                <MenuItem value="solicitor">Solicitor</MenuItem>
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
              value={formData.password}
              onChange={handleChange}
              error={!!validationErrors.password}
              helperText={validationErrors.password}
              InputProps={{
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

            <TextField
              fullWidth
              margin="normal"
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={!!validationErrors.confirmPassword}
              helperText={validationErrors.confirmPassword}
            />
          </Box>
        );

      case 1:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                error={!!validationErrors.firstName}
                helperText={validationErrors.firstName}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                error={!!validationErrors.lastName}
                helperText={validationErrors.lastName}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Phone Number"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                error={!!validationErrors.phone}
                helperText={validationErrors.phone}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
        );

      case 2:
        return formData.role === 'client' ? (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Street Address"
                value={formData.address.street}
                onChange={(e) => handleNestedChange('address', 'street', e.target.value)}
                error={!!validationErrors['address.street']}
                helperText={validationErrors['address.street']}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="City"
                value={formData.address.city}
                onChange={(e) => handleNestedChange('address', 'city', e.target.value)}
                error={!!validationErrors['address.city']}
                helperText={validationErrors['address.city']}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Postcode"
                value={formData.address.postcode}
                onChange={(e) => handleNestedChange('address', 'postcode', e.target.value)}
                error={!!validationErrors['address.postcode']}
                helperText={validationErrors['address.postcode']}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date of Birth"
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                error={!!validationErrors.dateOfBirth}
                helperText={validationErrors.dateOfBirth}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="National Insurance Number"
                name="nationalInsuranceNumber"
                value={formData.nationalInsuranceNumber}
                onChange={handleChange}
                error={!!validationErrors.nationalInsuranceNumber}
                helperText={validationErrors.nationalInsuranceNumber}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Employment Status</InputLabel>
                <Select
                  name="employmentStatus"
                  value={formData.employmentStatus}
                  onChange={handleChange}
                  label="Employment Status"
                >
                  <MenuItem value="employed">Employed</MenuItem>
                  <MenuItem value="self-employed">Self-employed</MenuItem>
                  <MenuItem value="unemployed">Unemployed</MenuItem>
                  <MenuItem value="student">Student</MenuItem>
                  <MenuItem value="retired">Retired</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        ) : (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Solicitor Number"
                name="solicitorNumber"
                value={formData.solicitorNumber}
                onChange={handleChange}
                error={!!validationErrors.solicitorNumber}
                helperText={validationErrors.solicitorNumber}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth error={!!validationErrors.specializations}>
                <InputLabel>Specializations</InputLabel>
                <Select
                  multiple
                  name="specializations"
                  value={formData.specializations}
                  onChange={handleChange}
                  label="Specializations"
                >
                  <MenuItem value="family">Family Law</MenuItem>
                  <MenuItem value="immigration">Immigration</MenuItem>
                  <MenuItem value="employment">Employment</MenuItem>
                  <MenuItem value="housing">Housing</MenuItem>
                  <MenuItem value="consumer">Consumer Rights</MenuItem>
                  <MenuItem value="welfare">Welfare Benefits</MenuItem>
                  <MenuItem value="criminal">Criminal Law</MenuItem>
                  <MenuItem value="civil">Civil Law</MenuItem>
                  <MenuItem value="business">Business Law</MenuItem>
                </Select>
                {validationErrors.specializations && (
                  <FormHelperText>{validationErrors.specializations}</FormHelperText>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Firm Name"
                value={formData.firm.name}
                onChange={(e) => handleNestedChange('firm', 'name', e.target.value)}
                error={!!validationErrors['firm.name']}
                helperText={validationErrors['firm.name']}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Years of Experience"
                type="number"
                name="yearsOfExperience"
                value={formData.yearsOfExperience}
                onChange={handleChange}
                InputProps={{ inputProps: { min: 0 } }}
              />
            </Grid>
          </Grid>
        );

      default:
        return null;
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        width: '100%',
        maxWidth: 600
      }}
    >
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Create an Account
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Register to access SLLS Legal Clinic services
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {renderStepContent(activeStep)}

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
        <Button
          onClick={handleBack}
          disabled={activeStep === 0 || loading}
        >
          Back
        </Button>
        
        {activeStep === steps.length - 1 ? (
          <Button
            variant="contained"
            type="submit"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Register'}
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={loading}
          >
            Next
          </Button>
        )}
      </Box>

      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Typography variant="body2">
          Already have an account?{' '}
          <Link
            component={RouterLink}
            to="/login"
            variant="body2"
            underline="hover"
          >
            Sign in here
          </Link>
        </Typography>
      </Box>
    </Box>
  );
};

export default Register;