import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  TextField,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { Visibility as VisibilityIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import axiosInstance from '../../utils/axios';

const CaseOverview = () => {
  const [casesData, setCasesData] = useState({
    cases: [],
    currentPage: 1,
    totalPages: 1,
    totalCases: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    search: '',
    page: 1,
    limit: 10
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Create clean filter params to avoid sending undefined/null values
      const cleanFilters = {};
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          // Handle object values properly
          if (typeof value === 'object') {
            cleanFilters[key] = value.status || value.value || value.name;
          } else {
            cleanFilters[key] = value;
          }
        }
      });
      
      console.log('Sending filters to API:', cleanFilters);
      
      const response = await axiosInstance.get('/admin/cases', {
        params: cleanFilters
      });
      
      console.log('API response:', response.data);
      setCasesData(response.data);
    } catch (err) {
      console.error('Error fetching cases:', err);
      const errorMessage = err.response?.data?.message || 
                           err.response?.data?.error || 
                           err.message ||
                           'Failed to fetch cases. Please try again later.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setFilters(prev => ({
      ...prev,
      page: newPage + 1
    }));
  };

  const handleChangeRowsPerPage = (event) => {
    const newLimit = parseInt(event.target.value, 10);
    setFilters(prev => ({
      ...prev,
      limit: newLimit,
      page: 1
    }));
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchCases();
    }, 300); // Add a small delay to avoid multiple rapid requests
    
    return () => clearTimeout(debounceTimer);
  }, [filters]); // Refetch when filters change

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: 1 // Reset to first page when filters change
    }));
  };

  const handleViewCase = (caseId) => {
    navigate(`/admin/cases/${caseId}`);
  };

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

  // Cleanup on unmount
  useEffect(() => {
    const controller = new AbortController();
    return () => {
      controller.abort();
    };
  }, []);

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
      <Typography variant="h4" component="h1" gutterBottom>
        Case Overview
      </Typography>

      <Box mb={3}>
        <Paper sx={{ p: 2 }}>
          <Box display="flex" gap={2}>
            <TextField
              select
              label="Status"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="new">New</MenuItem>
              <MenuItem value="under_review">Under Review</MenuItem>
              <MenuItem value="assigned">Assigned</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="pending_client">Pending Client</MenuItem>
              <MenuItem value="closed">Closed</MenuItem>
            </TextField>
            
            <TextField
              select
              label="Area of Law"
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="family">Family Law</MenuItem>
              <MenuItem value="immigration">Immigration Law</MenuItem>
              <MenuItem value="housing">Housing Law</MenuItem>
              <MenuItem value="employment">Employment Law</MenuItem>
              <MenuItem value="civil">Civil Law</MenuItem>
              <MenuItem value="criminal">Criminal Law</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </TextField>
          </Box>
        </Paper>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Case Number</TableCell>
              <TableCell>Client</TableCell>
              <TableCell>Solicitor</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Area of Law</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {casesData.cases.map((caseItem) => (
                <TableRow key={caseItem._id}>
                  <TableCell>{caseItem.caseNumber}</TableCell>
                  <TableCell>
                    {`${caseItem.client.firstName} ${caseItem.client.lastName}`}
                  </TableCell>
                  <TableCell>
                    {caseItem.assignedSolicitor ?
                      `${caseItem.assignedSolicitor.firstName} ${caseItem.assignedSolicitor.lastName}` :
                      'Unassigned'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={(() => {
                        if (typeof caseItem.status === 'object') {
                          const statusValue = caseItem.status.status || caseItem.status.value;
                          return statusValue
                            ? statusValue.charAt(0).toUpperCase() + statusValue.slice(1)
                            : 'Unknown';
                        }
                        return typeof caseItem.status === 'string'
                          ? caseItem.status.charAt(0).toUpperCase() + caseItem.status.slice(1)
                          : 'Unknown';
                      })()}
                      color={getStatusColor(typeof caseItem.status === 'object' && caseItem.status.status
                        ? caseItem.status.status
                        : (typeof caseItem.status === 'string' ? caseItem.status : ''))}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {typeof caseItem.type === 'object'
                      ? ((caseItem.type.name || caseItem.type.value || 'Unknown').charAt(0).toUpperCase() +
                         (caseItem.type.name || caseItem.type.value || 'Unknown').slice(1))
                      : (typeof caseItem.type === 'string'
                          ? caseItem.type.charAt(0).toUpperCase() + caseItem.type.slice(1)
                          : 'Unknown')}
                  </TableCell>
                  <TableCell>
                    {format(new Date(caseItem.createdAt), 'PPP')}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleViewCase(caseItem._id)}
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50]}
          component="div"
          count={casesData.totalCases}
          rowsPerPage={filters.limit}
          page={filters.page - 1}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>
    </Container>
  );
};

export default CaseOverview;