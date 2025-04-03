import React, { useEffect } from 'react';
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
  CardActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Gavel as GavelIcon,
  Schedule as ScheduleIcon,
  Notifications as NotificationsIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { fetchCases, selectCases, selectCasesLoading } from '../../redux/slices/casesSlice';
import { selectNotifications } from '../../redux/slices/notificationsSlice';
import CaseCard from '../../components/cases/CaseCard';

const DashboardCard = ({ title, value, subtitle, icon, color }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="h3" component="div" gutterBottom>
            {value}
          </Typography>
          <Typography variant="h6" color="textSecondary">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="textSecondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            backgroundColor: `${color}.light`,
            borderRadius: '50%',
            p: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const ClientDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const cases = useSelector(selectCases);
  const loading = useSelector(selectCasesLoading);
  const notifications = useSelector(selectNotifications);
  const user = useSelector(state => state.auth.user);

  useEffect(() => {
    dispatch(fetchCases({ client: user.id }));
  }, [dispatch, user.id]);

  const activeCases = cases.filter(c => !['resolved', 'closed', 'archived'].includes(c.status));
  const urgentCases = cases.filter(c => c.priority === 'urgent' && c.status !== 'resolved');
  const pendingResponse = cases.filter(c => ['awaiting_client'].includes(c.status));

  const recentNotifications = notifications.slice(0, 5);

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
          Welcome back, {user.firstName}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/client/new-case')}
        >
          New Case
        </Button>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardCard
            title="Active Cases"
            value={activeCases.length}
            icon={<GavelIcon sx={{ color: 'primary.main' }} />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardCard
            title="Urgent Cases"
            value={urgentCases.length}
            icon={<ScheduleIcon sx={{ color: 'error.main' }} />}
            color="error"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardCard
            title="Pending Response"
            value={pendingResponse.length}
            icon={<NotificationsIcon sx={{ color: 'warning.main' }} />}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardCard
            title="Total Cases"
            value={cases.length}
            icon={<GavelIcon sx={{ color: 'info.main' }} />}
            color="info"
          />
        </Grid>
      </Grid>

      {/* Recent Cases and Notifications */}
      <Grid container spacing={3}>
        {/* Recent Cases */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Recent Cases</Typography>
              <Button
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/client/cases')}
              >
                View All
              </Button>
            </Box>
            {activeCases.length === 0 ? (
              <Alert severity="info">
                You don't have any active cases. Click 'New Case' to get started.
              </Alert>
            ) : (
              activeCases.slice(0, 3).map(caseItem => (
                <CaseCard
                  key={caseItem.id}
                  caseData={caseItem}
                />
              ))
            )}
          </Paper>
        </Grid>

        {/* Notifications and Updates */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recent Updates
            </Typography>
            <List>
              {recentNotifications.length === 0 ? (
                <ListItem>
                  <ListItemText
                    primary="No recent updates"
                    secondary="You're all caught up!"
                  />
                </ListItem>
              ) : (
                recentNotifications.map((notification, index) => (
                  <React.Fragment key={notification.id || index}>
                    <ListItem>
                      <ListItemIcon>
                        {notification.type === 'case_update' ? (
                          <GavelIcon color="primary" />
                        ) : (
                          <NotificationsIcon color="info" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={notification.message}
                        secondary={new Date(notification.timestamp).toLocaleString()}
                      />
                    </ListItem>
                    {index < recentNotifications.length - 1 && <Divider />}
                  </React.Fragment>
                ))
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ClientDashboard;