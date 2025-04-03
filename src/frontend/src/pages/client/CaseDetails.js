import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Divider,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { format } from 'date-fns';
import axios from 'axios';
import CaseTimeline from '../../components/cases/CaseTimeline';

const CaseDetails = () => {
  const { id } = useParams();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCaseDetails = async () => {
      try {
        const response = await axios.get(`/api/cases/${id}`);
        setCaseData(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch case details. Please try again later.');
        setLoading(false);
      }
    };

    fetchCaseDetails();
  }, [id]);

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

  if (!caseData) {
    return (
      <Container>
        <Typography align="center">Case not found</Typography>
      </Container>
    );
  }

  return (
    <Container>
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Case Details
        </Typography>
        <Chip
          label={caseData.status}
          color={
            caseData.status === 'OPEN' ? 'primary' :
            caseData.status === 'IN_PROGRESS' ? 'warning' :
            caseData.status === 'CLOSED' ? 'success' : 'default'
          }
        />
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Case Summary
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Case Number
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {caseData.caseNumber}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Submitted Date
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {format(new Date(caseData.createdAt), 'PPP')}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">
                  Description
                </Typography>
                <Typography variant="body1" paragraph>
                  {caseData.description}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Case Timeline
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <CaseTimeline events={caseData.timeline || []} />
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Assigned Solicitor
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {caseData.solicitor ? (
              <>
                <Typography variant="body1">
                  {caseData.solicitor.name}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {caseData.solicitor.email}
                </Typography>
              </>
            ) : (
              <Typography variant="body2" color="textSecondary">
                No solicitor assigned yet
              </Typography>
            )}
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Documents
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <List>
              {caseData.documents && caseData.documents.length > 0 ? (
                caseData.documents.map((doc, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={doc.name}
                      secondary={format(new Date(doc.uploadedAt), 'PPP')}
                    />
                  </ListItem>
                ))
              ) : (
                <ListItem>
                  <ListItemText
                    secondary="No documents uploaded"
                  />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default CaseDetails;