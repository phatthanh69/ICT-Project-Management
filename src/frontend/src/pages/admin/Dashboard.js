import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axios';
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
  LinearProgress,
  Tooltip
} from '@mui/material';
import {
  People as PeopleIcon,
  Gavel as GavelIcon,
  Warning as WarningIcon,
  AccessTime as AccessTimeIcon,
  TrendingUp as TrendingUpIcon,
  Person as PersonIcon,
  ArrowForward as ArrowForwardIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { fetchCases } from '../../redux/slices/casesSlice';
import { Bar } from 'react-chartjs-2';
import DataTable from '../../components/common/DataTable';

const StatCard = ({ title, value, subtitle, icon, color, trend }) => (
  <Card>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Box
          sx={{
            backgroundColor: `${color}.lighter`,
            borderRadius: '50%',
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {icon}
        </Box>
        {trend !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TrendingUpIcon
              fontSize="small"
              sx={{ color: trend >= 0 ? 'success.main' : 'error.main' }}
            />
            <Typography
              variant="body2"
              sx={{ color: trend >= 0 ? 'success.main' : 'error.main' }}
            >
              {trend.toFixed(1)}%
            </Typography>
          </Box>
        )}
      </Box>
      <Typography variant="h4" gutterBottom>
        {typeof value === 'object'
          ? (value.count || value.value || value.name || 0)
          : value}
      </Typography>
      <Typography variant="subtitle2" color="textSecondary">
        {typeof title === 'object' ? (title.name || title.role || 'Unknown') : title}
      </Typography>
      {subtitle && (
        <Typography variant="caption" color="textSecondary" display="block">
          {subtitle}
        </Typography>
      )}
    </CardContent>
  </Card>
);

const AdminDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalCases: 0,
    pendingCases: 0,
    totalSolicitors: 0,
    totalClients: 0,
    caseTypes: {},
    recentActivity: [],
    urgentCases: []
  });

  const validateStats = (data) => {
    return {
      totalCases: Number(data.overview.totalCases) || 0,
      pendingCases: (Number(data.overview.newCases) || 0) + (Number(data.overview.assignedCases) || 0),
      totalSolicitors: Number(data.overview.totalSolicitors) || 0,
      totalClients: Number(data.overview.totalClients) || 0,
      caseTypes: data.caseTypes ? Object.fromEntries(
        Object.entries(data.caseTypes)
          .filter(([key]) => typeof key === 'string')
          .map(([key, value]) => [key, typeof value === 'object' ? value.count || 0 : (Number(value) || 0)])
      ) : {},
      recentActivity: Array.isArray(data.activities) ? data.activities : [],
      urgentCases: Array.isArray(data.urgentCases) ? data.urgentCases : []
    };
  };
  
  const [trends, setTrends] = useState({
    totalCases: 0,
    pendingCases: 0,
    totalSolicitors: 0,
    totalClients: 0
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [statsRes, trendsRes, activityRes, urgentRes] = await Promise.all([
          axiosInstance.get('/admin/stats'),
          axiosInstance.get('/admin/trends'),
          axiosInstance.get('/admin/activity-log', { params: { limit: 5 } }),
          axiosInstance.get('/admin/urgent-cases')
        ]);

        const validatedStats = validateStats({
          overview: statsRes.data.overview,
          caseTypes: statsRes.data.caseTypes,
          activities: activityRes.data.activities,
          urgentCases: urgentRes.data
        });
        
        setStats(validatedStats);

        // Update trends with validated numbers
        setTrends({
          totalCases: Number(trendsRes.data.totalCases) || 0,
          pendingCases: Number(trendsRes.data.openCases) || 0,
          totalSolicitors: Number(trendsRes.data.solicitorTrend) || 0,
          totalClients: Number(trendsRes.data.clientTrend) || 0
        });

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [dispatch]);

  const caseTypeData = {
    labels: Object.keys(stats.caseTypes || {}).map(type => {
      if (!type) return 'Uncategorized';
      if (typeof type === 'object') {
        return type.name ? type.name.charAt(0).toUpperCase() + type.name.slice(1) : 'Uncategorized';
      }
      return type.charAt(0).toUpperCase() + type.slice(1);
    }).filter(Boolean),
    datasets: [
      {
        label: 'Number of Cases',
        data: Object.values(stats.caseTypes || {}).map(count => {
          if (typeof count === 'object') {
            return count.count !== undefined ? count.count : 0;
          }
          return typeof count === 'number' ? count : 0;
        }),
        backgroundColor: [
          '#1976d2',
          '#2196f3',
          '#64b5f6',
          '#90caf9',
          '#bbdefb',
          '#e3f2fd'
        ]
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
        <Button variant="contained" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </Box>
    );
  }

  const getStatusColor = (status) => {
    if (!status) return 'default';
    
    // Ensure status is a string
    const statusStr = typeof status === 'object'
      ? (status.status || status.value || status.type || '')
      : (typeof status === 'string' ? status : '');
    
    switch (statusStr) {
      case 'new':
        return 'info';
      case 'under_review':
        return 'warning';
      case 'assigned':
        return 'primary';
      case 'in_progress':
        return 'warning';
      case 'pending_client':
        return 'error';
      case 'closed':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusString = (status) => {
    if (!status) return 'N/A';
    
    if (typeof status === 'object') {
      const statusValue = status.status || status.value;
      return statusValue
        ? statusValue.charAt(0).toUpperCase() + statusValue.slice(1)
        : 'Unknown';
    }
    return typeof status === 'string'
      ? status.charAt(0).toUpperCase() + status.slice(1)
      : 'Unknown';
  };

  const getTypeString = (type) => {
    if (!type) return 'N/A';
    if (typeof type === 'object') {
      return (type.name || type.value || 'Unknown Type').charAt(0).toUpperCase() + 
             (type.name || type.value || 'Unknown Type').slice(1);
    }
    return typeof type === 'string'
      ? type.charAt(0).toUpperCase() + type.slice(1)
      : 'Unknown Type';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Admin Dashboard
        </Typography>
        <Box>
          <Button
            variant="contained"
            onClick={() => navigate('/admin/reports')}
            sx={{ mr: 1 }}
          >
            Generate Report
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate('/admin/users')}
          >
            Manage Users
          </Button>
        </Box>
      </Box>

      {/* Statistics Overview */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Cases"
            value={stats.totalCases}
            icon={<GavelIcon sx={{ color: 'primary.main' }} />}
            color="primary"
            trend={trends.totalCases}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pending Cases"
            value={stats.pendingCases}
            icon={<WarningIcon sx={{ color: 'warning.main' }} />}
            color="warning"
            trend={trends.pendingCases}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Solicitors"
            value={stats.totalSolicitors}
            icon={<PersonIcon sx={{ color: 'success.main' }} />}
            color="success"
            trend={trends.totalSolicitors}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Registered Clients"
            value={stats.totalClients}
            icon={<PeopleIcon sx={{ color: 'info.main' }} />}
            color="info"
            trend={trends.totalClients}
          />
        </Grid>
      </Grid>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Case Distribution Chart */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Case Distribution by Type
            </Typography>
            <Box sx={{ height: 300 }}>
              {Object.keys(stats.caseTypes || {}).length > 0 ? (
                <Bar data={caseTypeData} options={chartOptions} />
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <Typography color="textSecondary">No case data available</Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Urgent Cases */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Cases Requiring Attention
              </Typography>
              <Tooltip title="Cases approaching deadline">
                <ErrorIcon color="warning" />
              </Tooltip>
            </Box>
            <List>
              {stats.urgentCases.length > 0 ? (
                stats.urgentCases.map((caseItem, index) => {
                  let dueDate = 'No deadline set';
                  if (caseItem.expectedResponseBy) {
                    try {
                      dueDate = `Due ${new Date(caseItem.expectedResponseBy).toLocaleDateString()}`;
                    } catch (e) {
                      dueDate = 'Invalid deadline';
                    }
                  }
                  
                  return (
                    <React.Fragment key={caseItem._id || index}>
                      <ListItem>
                        <ListItemIcon>
                          <AccessTimeIcon color="error" />
                        </ListItemIcon>
                        <ListItemText
                          primary={String(caseItem.caseNumber || 'Unknown Case')}
                          secondary={`${getTypeString(caseItem.type)} - ${getStatusString(caseItem.status)} - ${dueDate}`}
                        />
                        <Button
                          size="small"
                          variant="outlined"
                          color="primary"
                          onClick={() => navigate(`/admin/cases/${caseItem._id}`)}
                        >
                          Review
                        </Button>
                      </ListItem>
                      {index < stats.urgentCases.length - 1 && <Divider />}
                    </React.Fragment>
                  );
                })
              ) : (
                <ListItem>
                  <ListItemText
                    primary="No urgent cases"
                    secondary="All cases are within deadline"
                  />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Recent Activity</Typography>
              <Button
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/admin/activity-log')}
              >
                View All
              </Button>
            </Box>
            {stats.recentActivity.length > 0 ? (
              <DataTable
                columns={[
                  { field: 'action', headerName: 'Action', width: 150 },
                  { field: 'details', headerName: 'Description', flex: 1 },
                  {
                    field: 'performer',
                    headerName: 'By',
                    width: 150,
                    valueFormatter: (params) => {
                      if (!params.value) return 'Unknown';
                      if (typeof params.value === 'object') {
                        const name = params.value.name || params.value.fullName || params.value.displayName;
                        return name ? String(name) : 'Unknown';
                      }
                      return String(params.value);
                    }
                  },
                  {
                    field: 'timestamp',
                    headerName: 'Time',
                    width: 200,
                    valueFormatter: (params) => {
                      if (!params.value) return 'Unknown';
                      try {
                        return new Date(params.value).toLocaleString();
                      } catch (e) {
                        return 'Invalid date';
                      }
                    }
                  },
                  {
                    field: 'caseNumber',
                    headerName: 'Case',
                    width: 150,
                    valueFormatter: (params) => params.value ? String(params.value) : 'Unknown'
                  },
                  // Adding this hidden column to ensure status objects are properly formatted
                  {
                    field: 'status',
                    headerName: 'Status',
                    width: 0,
                    hide: true,
                    valueFormatter: (params) => params.value ? getStatusString(params.value) : 'Unknown'
                  }
                ]}
                data={stats.recentActivity.map(activity => ({
                  ...activity,
                  id: activity._id || Math.random().toString(),
                  // Format all potential object values into strings
                  action: typeof activity.action === 'object' ? getStatusString(activity.action) : activity.action,
                  details: (() => {
                    if (!activity.details) return 'N/A';
                    if (typeof activity.details === 'object') {
                      const {name, role, status, ...rest} = activity.details;
                      return name || role || status || Object.values(rest)[0] || 'N/A';
                    }
                    return activity.details;
                  })(),
                  status: typeof activity.status === 'object' ? getStatusString(activity.status) : activity.status
                }))}
                pagination={false}
              />
            ) : (
              <Box p={2} textAlign="center">
                <Typography color="textSecondary">No recent activity found</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminDashboard;
