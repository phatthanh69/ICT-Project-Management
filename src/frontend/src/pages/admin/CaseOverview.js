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
  Alert,
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
    totalCases: 0,
    itemsPerPage: 10
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    priority: '',
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
      
      // Create clean filter params
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== null && v !== undefined && v !== '')
      );
      
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
    if (caseId) {
      navigate(`/admin/cases/${caseId}`);
    }
  };

  const getStatusColor = (status) => {
    if (!status) return 'default';
    
    let statusStr = '';
    
    if (typeof status === 'object') {
      statusStr = status.status || status.value || '';
    } else if (typeof status === 'string') {
      statusStr = status.toLowerCase();
    }
    
    switch (statusStr) {
      case 'new': return 'info';
      case 'under_review': return 'warning';
      case 'assigned': return 'primary';
      case 'in_progress': return 'warning';
      case 'pending_client': return 'error';
      case 'closed': return 'success';
      default: return 'default';
    }
  };

  // Format status text for display
  const formatStatus = (status) => {
    if (!status) return 'Unknown';
    
    let statusStr = '';
    
    if (typeof status === 'object') {
      statusStr = status.status || status.value || '';
    } else if (typeof status === 'string') {
      statusStr = status;
    }
    
    // Convert snake_case to Title Case
    return statusStr
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Format case type for display
  const formatType = (type) => {
    if (!type) return 'Unknown';
    
    if (typeof type === 'object') {
      return (type.name || type.value || 'Unknown').charAt(0).toUpperCase() + 
             (type.name || type.value || 'Unknown').slice(1);
    }
    
    if (typeof type === 'string') {
      return type.charAt(0).toUpperCase() + type.slice(1);
    }
    
    return 'Unknown';
  };

  // Get client name safely
  const getClientName = (caseItem) => {
    if (!caseItem.client) return 'Unknown Client';
    
    // Check if client has User property (nested association)
    if (caseItem.client.User) {
      return `${caseItem.client.User.firstName || ''} ${caseItem.client.User.lastName || ''}`.trim() || 'Unknown';
    }
    
    // Direct properties on client
    return `${caseItem.client.firstName || ''} ${caseItem.client.lastName || ''}`.trim() || 'Unknown';
  };

  // Get solicitor name safely
  const getSolicitorName = (caseItem) => {
    if (!caseItem.assignedSolicitor) return 'Unassigned';
    
    // Check if solicitor has User property (nested association)
    if (caseItem.assignedSolicitor.User) {
      return `${caseItem.assignedSolicitor.User.firstName || ''} ${caseItem.assignedSolicitor.User.lastName || ''}`.trim() || 'Unknown';
    }
    
    // Direct properties on solicitor
    return `${caseItem.assignedSolicitor.firstName || ''} ${caseItem.assignedSolicitor.lastName || ''}`.trim() || 'Unknown';
  };

  // Format date safely
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    
    try {
      return format(new Date(dateString), 'PPP');
    } catch (err) {
      console.error('Date formatting error:', err);
      return 'Invalid Date';
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

  return (
    <Container>
      <Typography variant="h4" component="h1" gutterBottom>
        Case Overview
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box mb={3}>
        <Paper sx={{ p: 2 }}>
          <Box display="flex" gap={2} flexWrap="wrap">
            <TextField
              select
              label="Status"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="NEW">New</MenuItem>
              <MenuItem value="UNDER_REVIEW">Under Review</MenuItem>
              <MenuItem value="ASSIGNED">Assigned</MenuItem>
              <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
              <MenuItem value="PENDING_CLIENT">Pending Client</MenuItem>
              <MenuItem value="CLOSED">Closed</MenuItem>
            </TextField>
            
            <TextField
              select
              label="Area of Law"
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="FAMILY">Family Law</MenuItem>
              <MenuItem value="IMMIGRATION">Immigration Law</MenuItem>
              <MenuItem value="HOUSING">Housing Law</MenuItem>
              <MenuItem value="EMPLOYMENT">Employment Law</MenuItem>
              <MenuItem value="CIVIL">Civil Law</MenuItem>
              <MenuItem value="CRIMINAL">Criminal Law</MenuItem>
              <MenuItem value="OTHER">Other</MenuItem>
            </TextField>
            
            <TextField
              label="Search"
              placeholder="Case number or description"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              sx={{ flexGrow: 1, minWidth: 200 }}
            />
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
            {casesData.cases && casesData.cases.length > 0 ? (
              casesData.cases.map((caseItem) => (
                <TableRow key={caseItem.id}>
                  <TableCell>{caseItem.caseNumber || 'N/A'}</TableCell>
                  <TableCell>{getClientName(caseItem)}</TableCell>
                  <TableCell>{getSolicitorName(caseItem)}</TableCell>
                  <TableCell>
                    <Chip
                      label={formatStatus(caseItem.status)}
                      color={getStatusColor(caseItem.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{formatType(caseItem.type)}</TableCell>
                  <TableCell>{formatDate(caseItem.createdAt)}</TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleViewCase(caseItem.id)}
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No cases found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50]}
          component="div"
          count={casesData.totalCases || 0}
          rowsPerPage={filters.limit}
          page={Math.max(0, filters.page - 1)}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>
    </Container>
  );
};

export default CaseOverview;