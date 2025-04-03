import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  Paper,
  Typography,
  Button,
  Box,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  Category as CategoryIcon,
  AccessTime as AccessTimeIcon,
  Gavel as GavelIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { fetchCases, selectCases, selectCasesLoading } from '../../redux/slices/casesSlice';
import CaseCard from '../../components/cases/CaseCard';

const StatCard = ({ title, value, icon, color, progress }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" alignItems="center" mb={1}>
        <Box
          sx={{
            backgroundColor: `${color}.light`,
            borderRadius: '50%',
            p: 1,
            mr: 2
          }}
        >
          {icon}
        </Box>
        <Typography variant="h6" component="div">
          {title}
        </Typography>
      </Box>
      <Typography variant="h4" component="div" gutterBottom>
        {value}
      </Typography>
      {progress !== undefined && (
        <Box sx={{ mt: 1 }}>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 8,
              borderRadius: 4
            }}
          />
          <Typography variant="caption" color="textSecondary">
            {progress}% of capacity
          </Typography>
        </Box>
      )}
    </CardContent>
  </Card>
);

const SolicitorDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const cases = useSelector(selectCases);
  const loading = useSelector(selectCasesLoading);
  const user = useSelector(state => state.auth.user);
  
  useEffect(() => {
    dispatch(fetchCases());
  }, [dispatch]);

  // Filter cases
  const myCases = cases.filter(c => c.assignedSolicitor?.id === user?.id || false);
  const availableCases = cases.filter(c =>
    c.status === 'new' &&
    !c.assignedSolicitor &&
    user?.specializations?.includes(c.type)
  );
  const urgentCases = myCases.filter(c =>
    c.priority === 'urgent' &&
    !['resolved', 'closed'].includes(c.status)
  );

  // Calculate case statistics
  const resolvedCases = myCases.filter(c => c.status === 'resolved');
  const caseloadPercentage = user?.availability?.maxCases
    ? Math.round((myCases.length / user.availability.maxCases) * 100)
    : 0;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Welcome, {user?.firstName || 'Solicitor'}
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate('/solicitor/available-cases')}
        >
          View Available Cases
        </Button>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Current Caseload"
            value={myCases.length}
            icon={<GavelIcon sx={{ color: 'primary.main' }} />}
            color="primary"
            progress={caseloadPercentage}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Available Cases"
            value={availableCases.length}
            icon={<CategoryIcon sx={{ color: 'info.main' }} />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Urgent Cases"
            value={urgentCases.length}
            icon={<WarningIcon sx={{ color: 'error.main' }} />}
            color="error"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Resolved Cases"
            value={resolvedCases.length}
            icon={<CheckCircleIcon sx={{ color: 'success.main' }} />}
            color="success"
          />
        </Grid>
      </Grid>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Available Cases */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Available Cases</Typography>
              <Button
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/solicitor/available-cases')}
              >
                View All
              </Button>
            </Box>
            {availableCases.length === 0 ? (
              <Alert severity="info">
                No new cases matching your specializations are currently available.
              </Alert>
            ) : (
              availableCases.slice(0, 3).map(caseItem => (
                <CaseCard
                  key={caseItem.id}
                  caseData={caseItem}
                  onAction={(action) => {
                    if (action === 'take') {
                      navigate(`/solicitor/cases/${caseItem.id}`);
                    }
                  }}
                />
              ))
            )}
          </Paper>

          {/* Current Cases */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Current Cases Requiring Attention
            </Typography>
            {urgentCases.length === 0 ? (
              <Alert severity="success">
                No urgent cases requiring immediate attention.
              </Alert>
            ) : (
              urgentCases.map(caseItem => (
                <CaseCard
                  key={caseItem.id}
                  caseData={caseItem}
                />
              ))
            )}
          </Paper>
        </Grid>

        {/* Specializations and Stats */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Your Specializations
            </Typography>
            <Box sx={{ mb: 2 }}>
              {user?.specializations?.map((specialization) => (
                <Chip
                  key={specialization}
                  label={specialization.replace('_', ' ')}
                  sx={{ m: 0.5 }}
                />
              ))}
            </Box>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Upcoming Deadlines
            </Typography>
            <List>
              {myCases
                .filter(c => c.nextDeadline && new Date(c.nextDeadline) > new Date())
                .sort((a, b) => new Date(a.nextDeadline) - new Date(b.nextDeadline))
                .slice(0, 5)
                .map((caseItem, index) => (
                  <React.Fragment key={caseItem.id}>
                    <ListItem>
                      <ListItemIcon>
                        <AccessTimeIcon color="warning" />
                      </ListItemIcon>
                      <ListItemText
                        primary={caseItem.caseNumber}
                        secondary={`Due: ${new Date(caseItem.nextDeadline).toLocaleDateString()}`}
                      />
                      <Button
                        size="small"
                        onClick={() => navigate(`/solicitor/cases/${caseItem.id}`)}
                      >
                        View
                      </Button>
                    </ListItem>
                    {index < Math.min(myCases.length, 4) && <Divider />}
                  </React.Fragment>
                ))}
              {myCases.length === 0 && (
                <ListItem>
                  <ListItemText
                    primary="No upcoming deadlines"
                    secondary="You're all caught up!"
                  />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SolicitorDashboard;