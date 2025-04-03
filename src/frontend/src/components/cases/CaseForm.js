import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  TextField,
  MenuItem,
  Grid,
  Button,
  Paper,
  Typography,
  FormControl,
  FormHelperText,
  CircularProgress,
  Alert
} from '@mui/material';
import { Save, Cancel } from '@mui/icons-material';

const CASE_TYPES = [
  { value: 'family', label: 'Family Law' },
  { value: 'immigration', label: 'Immigration' },
  { value: 'employment', label: 'Employment' },
  { value: 'housing', label: 'Housing' },
  { value: 'civil', label: 'Civil Law' },
  { value: 'criminal', label: 'Criminal Law' },
  { value: 'other', label: 'Other' }
];

const PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' }
];

const CASE_STATUSES = [
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'PENDING_REVIEW', label: 'Pending Review' },
  { value: 'AWAITING_CLIENT', label: 'Awaiting Client' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'CLOSED', label: 'Closed' }
];

const CaseForm = ({ initialData, onSubmit, onCancel, loading, error }) => {
  const [formData, setFormData] = useState({
    type: '',
    priority: 'MEDIUM',
    description: '',
    additionalNotes: '',
    ...initialData
  });

  const [validationErrors, setValidationErrors] = useState({});
  const user = useSelector(state => state.auth.user);

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  const validateForm = () => {
    const errors = {};

    if (!formData.type) {
      errors.type = 'Case type is required';
    }

    if (!formData.description || formData.description.trim().length === 0) {
      errors.description = 'Description is required';
    }

    if (!formData.priority) {
      errors.priority = 'Priority level is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear validation error when field is updated
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              {initialData ? 'Edit Case Details' : 'Create New Case'}
            </Typography>
          </Grid>

          {error && (
            <Grid item xs={12}>
              <Alert severity="error">{error}</Alert>
            </Grid>
          )}

          <Grid item xs={12} md={6}>
            <FormControl fullWidth error={!!validationErrors.type}>
              <TextField
                select
                name="type"
                label="Case Type"
                value={formData.type}
                onChange={handleChange}
                error={!!validationErrors.type}
                required
              >
                {CASE_TYPES.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
              {validationErrors.type && (
                <FormHelperText>{validationErrors.type}</FormHelperText>
              )}
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth error={!!validationErrors.priority}>
              <TextField
                select
                name="priority"
                label="Priority Level"
                value={formData.priority}
                onChange={handleChange}
                error={!!validationErrors.priority}
                required
              >
                {PRIORITIES.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
              {validationErrors.priority && (
                <FormHelperText>{validationErrors.priority}</FormHelperText>
              )}
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <FormControl fullWidth error={!!validationErrors.description}>
              <TextField
                name="description"
                label="Case Description"
                multiline
                rows={4}
                value={formData.description}
                onChange={handleChange}
                error={!!validationErrors.description}
                helperText={validationErrors.description || 'Provide detailed information about your legal issue'}
                required
              />
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <TextField
              name="additionalNotes"
              label="Additional Notes"
              multiline
              rows={3}
              value={formData.additionalNotes}
              onChange={handleChange}
              fullWidth
            />
          </Grid>

          {user.role === 'admin' && initialData && (
            <Grid item xs={12}>
              <TextField
                select
                name="status"
                label="Case Status"
                value={formData.status}
                onChange={handleChange}
                fullWidth
              >
                {CASE_STATUSES.map(status => (
                  <MenuItem key={status.value} value={status.value}>
                    {status.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          )}

          <Grid item xs={12}>
            <Box display="flex" justifyContent="flex-end" gap={2}>
              <Button
                type="button"
                onClick={onCancel}
                startIcon={<Cancel />}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                startIcon={loading ? <CircularProgress size={24} /> : <Save />}
                disabled={loading}
              >
                {loading ? 'Saving...' : initialData ? 'Update Case' : 'Create Case'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
};

export default CaseForm;