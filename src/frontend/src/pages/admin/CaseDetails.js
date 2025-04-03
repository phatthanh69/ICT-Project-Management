import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import axiosInstance from '../../utils/axios';

const CaseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCaseDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axiosInstance.get(`/admin/cases/${id}`);
        setCaseData(response.data);
      } catch (err) {
        console.error('Error fetching case details:', err);
        const errorMessage = err.response?.data?.message || 
                           err.response?.data?.error || 
                           err.message ||
                           'Failed to fetch case details.';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchCaseDetails();
    }
  }, [id]);

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

  const handleBackToList = () => {
    navigate('/admin/cases');
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
        <Box sx={{ mb: 2 }}>
          <Button variant="outlined" onClick={handleBackToList}>
            Back to Case List
          </Button>
        </Box>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!caseData) {
    return (
      <Container>
        <Box sx={{ mb: 2 }}>
          <Button variant="outlined" onClick={handleBackToList}>
            Back to Case List
          </Button>
        </Box>
        <Alert severity="warning">No case data found</Alert>
      </Container>
    );
  }

  return (
    <Container>
      <Box sx={{ mb: 3 }}>
        <Button variant="outlined" onClick={handleBackToList}>
          Back to Case List
        </Button>
      </Box>
      
      <Typography variant="h4" component="h1" gutterBottom>
        Case: {caseData.caseNumber || 'N/A'}
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" component="div" sx={{ mb: 1 }}>
              Status: 
              <Chip
                label={formatStatus(caseData.status)}
                color={getStatusColor(caseData.status)}
                size="small"
                sx={{ ml: 1 }}
              />
            </Typography>
            
            <Typography variant="subtitle1" component="div" sx={{ mb: 1 }}>
              Area of Law: {caseData.type?.charAt(0).toUpperCase() + caseData.type?.slice(1) || 'N/A'}
            </Typography>
            
            <Typography variant="subtitle1" component="div" sx={{ mb: 1 }}>
              Priority: {caseData.priority?.charAt(0).toUpperCase() + caseData.priority?.slice(1) || 'N/A'}
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" component="div" sx={{ mb: 1 }}>
              Created: {formatDate(caseData.createdAt)}
            </Typography>
            
            <Typography variant="subtitle1" component="div" sx={{ mb: 1 }}>
              Last Updated: {formatDate(caseData.updatedAt)}
            </Typography>
            
            {caseData.dueDate && (
              <Typography variant="subtitle1" component="div" sx={{ mb: 1 }}>
                Due Date: {formatDate(caseData.dueDate)}
              </Typography>
            )}
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 2 }} />
        
        <Typography variant="h6" component="h2" gutterBottom>
          Case Description
        </Typography>
        <Typography variant="body1" component="div" sx={{ mb: 2 }}>
          {caseData.description || 'No description provided'}
        </Typography>
      </Paper>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Client Information" />
            <CardContent>
              {caseData.client && caseData.client.User ? (
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="Name" 
                      secondary={`${caseData.client.User.firstName || ''} ${caseData.client.User.lastName || ''}`.trim() || 'Unknown'} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Email" 
                      secondary={caseData.client.User.email || 'N/A'} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Phone" 
                      secondary={caseData.client.User.phoneNumber || 'N/A'} 
                    />
                  </ListItem>
                </List>
              ) : (
                <Typography>No client information available</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Solicitor Information" />
            <CardContent>
              {caseData.assignedSolicitor && caseData.assignedSolicitor.User ? (
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="Name" 
                      secondary={`${caseData.assignedSolicitor.User.firstName || ''} ${caseData.assignedSolicitor.User.lastName || ''}`.trim() || 'Unknown'} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Email" 
                      secondary={caseData.assignedSolicitor.User.email || 'N/A'} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Phone" 
                      secondary={caseData.assignedSolicitor.User.phoneNumber || 'N/A'} 
                    />
                  </ListItem>
                </List>
              ) : (
                <Typography>No assigned solicitor</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default CaseDetails;
