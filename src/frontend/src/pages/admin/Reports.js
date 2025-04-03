import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  MenuItem,
  TextField,
  CircularProgress,
} from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import axiosInstance from '../../utils/axios';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('month');
  const [stats, setStats] = useState({
    totalCases: 0,
    openCases: 0,
    closedCases: 0,
    averageResolutionTime: 0,
    casesByStatus: {},
    casesByAreaOfLaw: {},
    casesByMonth: {},
    solicitorPerformance: [],
  });

  useEffect(() => {
    fetchReportData();
  }, [timeRange]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/admin/reports', {
        params: { timeRange },
      });
      
      // Normalize status keys to handle inconsistent casing
      const normalizedData = { ...response.data };
      if (normalizedData.casesByStatus) {
        normalizedData.casesByStatus = Object.entries(normalizedData.casesByStatus).reduce((acc, [key, value]) => {
          // Convert any status key to lowercase for consistent handling
          const normalizedKey = typeof key === 'string' ? key.toLowerCase() : key;
          acc[normalizedKey] = value;
          return acc;
        }, {});
      }
      
      setStats(normalizedData);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching report data:', err);
      setError('Failed to fetch report data. Please try again later.');
      setLoading(false);
    }
  };

  const caseStatusData = {
    labels: Object.keys(stats.casesByStatus || {}).map(status => {
      if (typeof status === 'object' && status.status) {
        return status.status.charAt(0).toUpperCase() + status.status.slice(1);
      }
      return typeof status === 'string' ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
    }),
    datasets: [
      {
        data: Object.values(stats.casesByStatus || {}).map(count => {
          return typeof count === 'object' && count.count !== undefined ? count.count : (typeof count === 'number' ? count : 0);
        }),
        backgroundColor: [
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
          'rgba(255, 159, 64, 0.8)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const caseAreaData = {
    labels: Object.keys(stats.casesByAreaOfLaw).map(area => {
      if (typeof area === 'object' && area.name) {
        return area.name.charAt(0).toUpperCase() + area.name.slice(1);
      }
      return typeof area === 'string' ? area.charAt(0).toUpperCase() + area.slice(1) : 'Unknown';
    }),
    datasets: [
      {
        label: 'Cases by Area of Law',
        data: Object.values(stats.casesByAreaOfLaw).map(count => {
          return typeof count === 'object' && count.count !== undefined ? count.count : (typeof count === 'number' ? count : 0);
        }),
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
      },
    ],
  };

  const monthlyTrendData = {
    labels: Object.keys(stats.casesByMonth),
    datasets: [
      {
        label: 'New Cases',
        data: Object.values(stats.casesByMonth).map(count => {
          return typeof count === 'object' && count.count !== undefined ? count.count : (typeof count === 'number' ? count : 0);
        }),
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
      },
    ],
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container>
        <Typography color="error" align="center">
          {error}
        </Typography>
      </Container>
    );
  }

  return (
    <Container>
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Reports & Analytics
        </Typography>
        <TextField
          select
          label="Time Range"
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="week">Last Week</MenuItem>
          <MenuItem value="month">Last Month</MenuItem>
          <MenuItem value="quarter">Last Quarter</MenuItem>
          <MenuItem value="year">Last Year</MenuItem>
        </TextField>
      </Box>

      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Total Cases
            </Typography>
            <Typography variant="h4">{stats.totalCases}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Open Cases
            </Typography>
            <Typography variant="h4">{stats.openCases}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Closed Cases
            </Typography>
            <Typography variant="h4">{stats.closedCases}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Avg. Resolution Time
            </Typography>
            <Typography variant="h4">{stats.averageResolutionTime} days</Typography>
          </Paper>
        </Grid>

        {/* Charts */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Case Status Distribution
            </Typography>
            <Box height={300}>
              <Pie data={caseStatusData} options={{ maintainAspectRatio: false }} />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Cases by Area of Law
            </Typography>
            <Box height={300}>
              <Bar
                data={caseAreaData}
                options={{
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                    },
                  },
                }}
              />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Monthly Case Trends
            </Typography>
            <Box height={300}>
              <Bar
                data={monthlyTrendData}
                options={{
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                    },
                  },
                }}
              />
            </Box>
          </Paper>
        </Grid>

        {/* Solicitor Performance */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Solicitor Performance
            </Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Solicitor</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Active Cases</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Closed Cases</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Avg. Resolution Time</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.solicitorPerformance.map((solicitor) => (
                    <tr key={solicitor.id}>
                      <td style={{ padding: '12px' }}>{solicitor.name}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>{solicitor.activeCases}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>{solicitor.closedCases}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>{solicitor.avgResolutionTime} days</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Reports;