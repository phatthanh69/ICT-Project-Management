import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Grid,
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import axiosInstance from '../../utils/axios';
import CaseCard from '../../components/cases/CaseCard';


const MyCases = () => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const response = await axiosInstance.get('/cases');
        
        // The backend returns a data structure with cases inside
        const casesData = response.data.cases || response.data;
        setCases(casesData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching cases:', err);
        setError(`Failed to fetch cases: ${err.message}. Please ensure the backend server is running.`);
        setLoading(false);
      }
    };

    fetchCases();
  }, []);

  const handleNewCase = () => {
    navigate('/client/new-case');
  };

  const handleCaseClick = (caseId) => {
    navigate(`/client/cases/${caseId}`);
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
        <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
          {error}
        </Alert>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => window.location.reload()}
          sx={{ mt: 2 }}
        >
          Retry
        </Button>
      </Container>
    );
  }

  return (
    <Container>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1">
          My Cases
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleNewCase}
        >
          New Case
        </Button>
      </Box>

      <Grid container spacing={3}>
        {cases.length === 0 ? (
          <Grid item xs={12}>
            <Typography align="center" color="textSecondary">
              You haven't submitted any cases yet.
            </Typography>
          </Grid>
        ) : (
          cases.map((caseItem) => (
            <Grid item xs={12} sm={6} md={4} key={caseItem._id}>
              <CaseCard
                caseData={caseItem}
                onClick={() => handleCaseClick(caseItem._id)}
              />
            </Grid>
          ))
        )}
      </Grid>
    </Container>
  );
};

export default MyCases;