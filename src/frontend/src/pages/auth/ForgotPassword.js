import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Container, Alert } from '@mui/material';
import { useFormik } from 'formik';
import * as yup from 'yup';
import axiosInstance from '../../utils/axios';

const validationSchema = yup.object({
  email: yup
    .string()
    .email('Enter a valid email')
    .required('Email is required'),
});

const ForgotPassword = () => {
  const [status, setStatus] = useState({ type: '', message: '' });

  const formik = useFormik({
    initialValues: {
      email: '',
    },
    validationSchema: validationSchema,
    onSubmit: async (values) => {
      try {
        await axiosInstance.post('/auth/forgot-password', values);
        setStatus({
          type: 'success',
          message: 'Password reset instructions have been sent to your email',
        });
      } catch (error) {
        setStatus({
          type: 'error',
          message: error.response?.data?.message || 'An error occurred. Please try again.',
        });
      }
    },
  });

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5">
          Forgot Password
        </Typography>
        <Box component="form" onSubmit={formik.handleSubmit} sx={{ mt: 1 }}>
          {status.message && (
            <Alert severity={status.type} sx={{ mb: 2 }}>
              {status.message}
            </Alert>
          )}
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={formik.values.email}
            onChange={formik.handleChange}
            error={formik.touched.email && Boolean(formik.errors.email)}
            helperText={formik.touched.email && formik.errors.email}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            Send Reset Instructions
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default ForgotPassword;