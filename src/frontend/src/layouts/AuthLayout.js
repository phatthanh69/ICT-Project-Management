import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Box,
  Container,
  Paper,
  Typography,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { Balance } from '@mui/icons-material';

const AuthLayout = () => {
  const { isAuthenticated, user } = useSelector(state => state.auth);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Redirect if already authenticated
  if (isAuthenticated) {
    const redirectPath = {
      client: '/client',
      solicitor: '/solicitor',
      admin: '/admin'
    }[user.role] || '/';
    
    return <Navigate to={redirectPath} replace />;
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme.palette.grey[100]
      }}
    >
      {/* Header */}
      <Box
        sx={{
          py: 2,
          px: 3,
          backgroundColor: theme.palette.primary.main,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2
        }}
      >
        <Balance fontSize="large" />
        <Typography variant="h5" component="h1">
          SLLS Legal Clinic
        </Typography>
      </Box>

      {/* Main Content */}
      <Container
        maxWidth="sm"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          py: 4
        }}
      >
        <Paper
          elevation={isMobile ? 0 : 3}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            backgroundColor: isMobile ? 'transparent' : 'white'
          }}
        >
          <Outlet />
        </Paper>
      </Container>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          py: 3,
          px: 2,
          mt: 'auto',
          backgroundColor: theme.palette.grey[200],
          textAlign: 'center'
        }}
      >
        <Typography variant="body2" color="text.secondary">
          © {new Date().getFullYear()} South London Law Society. All rights reserved.
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          Providing legal services to the community
        </Typography>
      </Box>
    </Box>
  );
};

export default AuthLayout;