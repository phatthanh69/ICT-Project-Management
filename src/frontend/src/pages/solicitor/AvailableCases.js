import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  CircularProgress,
  Chip,
} from '@mui/material';
import { format } from 'date-fns';
import axiosInstance from '../../utils/axios';

const AvailableCases = () => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAvailableCases();
  }, []);

  const fetchAvailableCases = async () => {
    try {
      // Query unassigned cases that match solicitor's specialization
      const response = await axiosInstance.get('/cases', {
        params: {
          status: 'OPEN',
          assigned: false,
          // The backend will automatically filter by specialization
          // based on the authenticated solicitor's profile
        }
      });
      setCases(response.data.cases || response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching available cases:', err);
      setError('Failed to fetch available cases. Please try again later.');
      setLoading(false);
    }
  };

  const handleAcceptCase = async (caseId) => {
    try {
      await axiosInstance.post(`/cases/${caseId}/accept`);
      // Remove the accepted case from the list
      setCases(cases.filter(c => c.id !== caseId));
    } catch (err) {
      console.error('Error accepting case:', err);
      setError(err.response?.data?.message || 'Failed to accept case. Please try again later.');
    }
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
        <Typography variant="h4" component="h1">
          Available Cases
        </Typography>
      </Box>

      {cases.length === 0 ? (
        <Typography align="center" color="textSecondary">
          No available cases at the moment.
        </Typography>
      ) : (
        <Grid container spacing={3}>
          {cases.map((caseItem) => (
            <Grid item xs={12} sm={6} md={4} key={caseItem.id}>
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
                    Submitted: {format(new Date(caseItem.createdAt), 'PPP')}
                  </Typography>
                  
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    sx={{
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      mb: 2
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
                    onClick={() => window.open(`/solicitor/cases/${caseItem.id}`, '_blank')}
                  >
                    View Details
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default AvailableCases;