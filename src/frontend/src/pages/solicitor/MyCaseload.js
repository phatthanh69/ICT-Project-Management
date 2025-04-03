import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Tabs,
  Tab,
} from '@mui/material';
import { format } from 'date-fns';
import axios from 'axios';

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const MyCaseload = () => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMyCases();
  }, []);

  const fetchMyCases = async () => {
    try {
      const response = await axios.get('/api/cases/my-caseload');
      setCases(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch cases. Please try again later.');
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleViewCase = (caseId) => {
    navigate(`/solicitor/cases/${caseId}`);
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

  const activeCases = cases.filter(c => c.status !== 'CLOSED');
  const closedCases = cases.filter(c => c.status === 'CLOSED');

  return (
    <Container>
      <Box mb={4}>
        <Typography variant="h4" component="h1">
          My Caseload
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label={`Active Cases (${activeCases.length})`} />
          <Tab label={`Closed Cases (${closedCases.length})`} />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {activeCases.length === 0 ? (
            <Grid item xs={12}>
              <Typography align="center" color="textSecondary">
                No active cases.
              </Typography>
            </Grid>
          ) : (
            activeCases.map((caseItem) => (
              <Grid item xs={12} sm={6} md={4} key={caseItem._id}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h6" component="h2">
                        {caseItem.caseNumber}
                      </Typography>
                      <Chip
                        label={caseItem.status}
                        color={caseItem.status === 'IN_PROGRESS' ? 'primary' : 'default'}
                        size="small"
                      />
                    </Box>
                    
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Client: {caseItem.client.name}
                    </Typography>
                    
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Updated: {format(new Date(caseItem.updatedAt), 'PPP')}
                    </Typography>

                    <Typography variant="body2" color="textSecondary">
                      Area of Law: {caseItem.areaOfLaw}
                    </Typography>
                  </CardContent>
                  
                  <CardActions>
                    <Button
                      size="small"
                      color="primary"
                      onClick={() => handleViewCase(caseItem._id)}
                    >
                      Manage Case
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          {closedCases.length === 0 ? (
            <Grid item xs={12}>
              <Typography align="center" color="textSecondary">
                No closed cases.
              </Typography>
            </Grid>
          ) : (
            closedCases.map((caseItem) => (
              <Grid item xs={12} sm={6} md={4} key={caseItem._id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" component="h2" gutterBottom>
                      {caseItem.caseNumber}
                    </Typography>
                    
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Client: {caseItem.client.name}
                    </Typography>
                    
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Closed: {format(new Date(caseItem.closedAt), 'PPP')}
                    </Typography>
                  </CardContent>
                  
                  <CardActions>
                    <Button
                      size="small"
                      onClick={() => handleViewCase(caseItem._id)}
                    >
                      View Details
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      </TabPanel>
    </Container>
  );
};

export default MyCaseload;