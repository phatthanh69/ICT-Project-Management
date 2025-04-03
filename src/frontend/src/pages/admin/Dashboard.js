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

// Safely convert any value to a string representation
const safeString = (value) => {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    // Handle Date objects
    if (value instanceof Date) return value.toLocaleString();
    // Array handling
    if (Array.isArray(value)) return value.map(safeString).join(', ');
    // Extract common properties from objects
    return value.name || value.value || value.count || 
           value.title || value.label || value.text ||
           value.id || value.displayName || value.description ||
           JSON.stringify(value);
  }
  return String(value);
};

const StatCard = ({ title, value, subtitle, icon, color, trend }) => {
  // Safely extract primitive values for rendering
  const displayValue = typeof value === 'object' 
    ? (value?.count || value?.value || value?.name || value?.total || 0) 
    : (value || 0);
  
  const displayTitle = typeof title === 'object'
    ? (title?.name || title?.label || title?.role || 'Unknown')
    : (title || 'Unknown');

  return (
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
                {typeof trend === 'number' ? trend.toFixed(1) : '0.0'}%
              </Typography>
            </Box>
          )}
        </Box>
        <Typography variant="h4" gutterBottom>
          {displayValue}
        </Typography>
        <Typography variant="subtitle2" color="textSecondary">
          {displayTitle}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="textSecondary" display="block">
            {typeof subtitle === 'object' ? safeString(subtitle) : subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

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

  // More robust stats validation to handle unexpected data types
  const validateStats = (data) => {
    const overview = data?.overview || {};
    const caseTypesData = data?.caseTypes || {};
    
    // Ensure numeric values
    const ensureNumber = (val) => {
      const num = Number(val);
      return isNaN(num) ? 0 : num;
    };
    
    // Process case types to ensure they're in a usable format
    const processedCaseTypes = {};
    Object.entries(caseTypesData).forEach(([key, value]) => {
      if (typeof key === 'string') {
        processedCaseTypes[key] = ensureNumber(
          typeof value === 'object' ? value?.count : value
        );
      }
    });
    
    return {
      totalCases: ensureNumber(overview?.totalCases),
      pendingCases: ensureNumber(overview?.newCases) + ensureNumber(overview?.assignedCases),
      totalSolicitors: ensureNumber(overview?.totalSolicitors),
      totalClients: ensureNumber(overview?.totalClients),
      caseTypes: processedCaseTypes,
      recentActivity: Array.isArray(data?.activities) ? data.activities : [],
      urgentCases: Array.isArray(data?.urgentCases) ? data.urgentCases : []
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
          axiosInstance.get('/dashboard/stats'),
          axiosInstance.get('/dashboard/trends'),
          axiosInstance.get('/dashboard/activity-log', { params: { limit: 5 } }),
          axiosInstance.get('/dashboard/urgent-cases')
        ]);

        const validatedStats = validateStats({
          overview: statsRes.data.overview,
          caseTypes: statsRes.data.caseTypes,
          activities: activityRes.data.activities,
          urgentCases: urgentRes.data
        });
        
        setStats(validatedStats);

        // Safely parse trend data
        const parseTrend = (value) => {
          const parsed = parseFloat(value);
          return isNaN(parsed) ? 0 : parsed;
        };

        // Update trends with validated numbers
        setTrends({
          totalCases: parseTrend(trendsRes.data.totalCases),
          pendingCases: parseTrend(trendsRes.data.openCases),
          totalSolicitors: parseTrend(trendsRes.data.solicitorTrend),
          totalClients: parseTrend(trendsRes.data.clientTrend)
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

  // Safely prepare chart data
  const prepareCaseTypeData = () => {
    const labels = Object.keys(stats.caseTypes || {}).map(type => {
      if (!type) return 'Uncategorized';
      return typeof type === 'string' 
        ? type.charAt(0).toUpperCase() + type.slice(1)
        : 'Unknown';
    }).filter(Boolean);

    const data = Object.values(stats.caseTypes || {}).map(count => {
      return typeof count === 'number' ? count : 0;
    });

    return {
      labels,
      datasets: [
        {
          label: 'Number of Cases',
          data,
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
  };

  const caseTypeData = prepareCaseTypeData();

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
    
    // Extract status string safely
    const statusStr = typeof status === 'object'
      ? safeString(status.status || status.value || status.type || '').toLowerCase()
      : (typeof status === 'string' ? status.toLowerCase() : '');
    
    switch (statusStr) {
      case 'new':
      case 'open':
        return 'info';
      case 'under_review':
        return 'warning';
      case 'assigned':
        return 'primary';
      case 'in_progress':
        return 'warning';
      case 'pending_client':
      case 'awaiting_client':
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
      const statusValue = safeString(status.status || status.value);
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
      const typeValue = safeString(type.name || type.value);
      return typeValue.charAt(0).toUpperCase() + typeValue.slice(1);
    }
    return typeof type === 'string'
      ? type.charAt(0).toUpperCase() + type.slice(1)
      : 'Unknown Type';
  };

  // Format date safely
  const formatDate = (dateValue) => {
    if (!dateValue) return 'No date';
    try {
      return new Date(dateValue).toLocaleDateString();
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Prepare activity data for table with safe transformations
  const prepareActivityData = () => {
    return stats.recentActivity.map(activity => {
      // Create a unique ID if none exists
      const id = activity.id || activity._id || Math.random().toString();
      
      // Safely extract and format action
      const action = typeof activity.action === 'object' 
        ? getStatusString(activity.action) 
        : safeString(activity.action);
      
      // Safely extract and format details
      const details = (() => {
        if (!activity.details) return 'N/A';
        if (typeof activity.details === 'object') {
          return safeString(activity.details);
        }
        return activity.details;
      })();
      
      // Safely format performer
      const performer = activity.performer 
        ? safeString(activity.performer) 
        : 'Unknown';
      
      // Safely format timestamp
      const timestamp = activity.timestamp 
        ? formatDate(activity.timestamp) 
        : 'Unknown date';
      
      // Safely format case number
      const caseNumber = activity.caseNumber 
        ? String(activity.caseNumber) 
        : 'Unknown';
      
      return {
        id,
        action,
        details,
        performer,
        timestamp,
        caseNumber,
        // Include original data for column formatters
        rawData: activity
      };
    });
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
                  // Safely extract case number
                  const caseNumber = caseItem.caseNumber || 'Unknown Case';
                  
                  // Safely format due date
                  let dueDate = 'No deadline set';
                  if (caseItem.expectedResponseBy) {
                    dueDate = `Due ${formatDate(caseItem.expectedResponseBy)}`;
                  }
                  
                  // Safely get type and status
                  const caseType = getTypeString(caseItem.type);
                  const caseStatus = getStatusString(caseItem.status);
                  
                  return (
                    <React.Fragment key={caseItem.id || caseItem._id || index}>
                      <ListItem>
                        <ListItemIcon>
                          <AccessTimeIcon color="error" />
                        </ListItemIcon>
                        <ListItemText
                          primary={String(caseNumber)}
                          secondary={`${caseType} - ${caseStatus} - ${dueDate}`}
                        />
                        <Button
                          size="small"
                          variant="outlined"
                          color="primary"
                          onClick={() => navigate(`/admin/cases/${caseItem.id || caseItem._id}`)}
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
                    renderCell: (params) => {
                      // Use renderCell instead of valueFormatter for better control
                      if (params.value && typeof params.value === 'object') {
                        return params.value.name || params.value.fullName || 'Unknown';
                      }
                      return params.value || 'Unknown';
                    }
                  },
                  {
                    field: 'timestamp',
                    headerName: 'Time',
                    width: 200,
                    renderCell: (params) => {
                      if (!params.value) return 'Unknown';
                      try {
                        if (typeof params.value === 'string') {
                          return params.value;
                        }
                        // If it's a date object or string date
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
                    renderCell: (params) => {
                      return params.value ? String(params.value) : 'Unknown';
                    }
                  }
                ]}
                data={prepareActivityData()}
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
