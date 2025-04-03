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
  LinearProgress,
  CardActions
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
import { format } from 'date-fns';
import axiosInstance from '../../utils/axios';

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
  const [availableCases, setAvailableCases] = useState([]);
  const [loadingAvailable, setLoadingAvailable] = useState(true);
  
  useEffect(() => {
    dispatch(fetchCases());
    
    // Fetch available cases directly, similar to AvailableCases.js
    const fetchAvailableCases = async () => {
      try {
        const response = await axiosInstance.get('/cases', {
          params: {
            status: 'OPEN',
            assigned: false,
          }
        });
        setAvailableCases(response.data.cases || response.data);
        setLoadingAvailable(false);
      } catch (err) {
        console.error('Error fetching available cases:', err);
        setLoadingAvailable(false);
      }
    };
    
    fetchAvailableCases();
  }, [dispatch]);

  // Filter cases
  const myCases = cases.filter(c => c.assignedSolicitor?.id === user?.id || false);
  const urgentCases = myCases.filter(c =>
    c.priority === 'urgent' &&
    !['resolved', 'closed'].includes(c.status)
  );

  // Calculate case statistics
  const resolvedCases = myCases.filter(c => c.status === 'closed');
  const caseloadPercentage = user?.availability?.maxCases
    ? Math.round((myCases.length / user.availability.maxCases) * 100)
    : 0;

  const handleAcceptCase = async (caseId) => {
    try {
      await axiosInstance.post(`/cases/${caseId}/accept`);
      // Remove the accepted case from the list
      setAvailableCases(availableCases.filter(c => c.id !== caseId));
      // Refresh my cases
      dispatch(fetchCases());
    } catch (err) {
      console.error('Error accepting case:', err);
    }
  };

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
            {loadingAvailable ? (
              <Box display="flex" justifyContent="center" p={2}>
                <CircularProgress size={30} />
              </Box>
            ) : availableCases.length === 0 ? (
              <Alert severity="info">
                No new cases matching your specializations are currently available.
              </Alert>
            ) : (
              <Grid container spacing={2}>
                {availableCases.slice(0, 3).map((caseItem) => (
                  <Grid item xs={12} md={6} key={caseItem.id}>
                    <Card>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                          <Typography variant="h6" component="h2">
                            {caseItem.caseNumber}
                          </Typography>
                          <Chip
                            label={caseItem.urgency || 'Normal'}
                            color={
                              caseItem.urgency === 'HIGH' ? 'error' :
                              caseItem.urgency === 'MEDIUM' ? 'warning' : 'default'
                            }
                            size="small"
                          />
                        </Box>
                        
                        <Typography variant="body2" color="textSecondary" gutterBottom>
                          Submitted: {caseItem.createdAt && format(new Date(caseItem.createdAt), 'dd/MM/yyyy')}
                        </Typography>
                        
                        <Typography
                          variant="body2"
                          color="textSecondary"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            mb: 1
                          }}
                        >
                          {caseItem.description}
                        </Typography>

                        <Typography variant="body2" color="textSecondary">
                          Area of Law: {caseItem.type}
                        </Typography>
                      </CardContent>
                      
                      <CardActions>
                        <Button
                          size="small"
                          color="primary"
                          onClick={() => handleAcceptCase(caseItem.id)}
                        >
                          Accept Case
                        </Button>
                        <Button
                          size="small"
                          onClick={() => navigate(`/solicitor/cases/${caseItem.id}`)}
                        >
                          View Details
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
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