import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  TextField,
  CircularProgress,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { format } from 'date-fns';
import axios from 'axios';
import CaseTimeline from '../../components/cases/CaseTimeline';

const CaseManagement = () => {
  const { id } = useParams();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    fetchCaseDetails();
  }, [id]);

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

  const handleAddNote = async () => {
    try {
      await axios.post(`/api/cases/${id}/notes`, { content: newNote });
      setNoteDialogOpen(false);
      setNewNote('');
      fetchCaseDetails(); // Refresh case data
    } catch (err) {
      setError('Failed to add note. Please try again.');
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      await axios.patch(`/api/cases/${id}/status`, { status: newStatus });
      fetchCaseDetails(); // Refresh case data
    } catch (err) {
      setError('Failed to update status. Please try again.');
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
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h4" component="h1">
            Case Management
          </Typography>
          <Box>
            <Chip
              label={caseData.status}
              color={
                caseData.status === 'OPEN' ? 'primary' :
                caseData.status === 'IN_PROGRESS' ? 'warning' :
                caseData.status === 'CLOSED' ? 'success' : 'default'
              }
              sx={{ mr: 1 }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={() => setNoteDialogOpen(true)}
            >
              Add Note
            </Button>
          </Box>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Case Information
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
                  Client Name
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {caseData.client.name}
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
              Case Actions
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box display="flex" flexDirection="column" gap={1}>
              {caseData.status === 'OPEN' && (
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  onClick={() => handleStatusUpdate('IN_PROGRESS')}
                >
                  Start Working
                </Button>
              )}
              {caseData.status === 'IN_PROGRESS' && (
                <Button
                  variant="contained"
                  color="success"
                  fullWidth
                  onClick={() => handleStatusUpdate('CLOSED')}
                >
                  Close Case
                </Button>
              )}
            </Box>
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
                  <ListItemText secondary="No documents uploaded" />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={noteDialogOpen} onClose={() => setNoteDialogOpen(false)}>
        <DialogTitle>Add Case Note</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Note"
            type="text"
            fullWidth
            multiline
            rows={4}
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddNote} variant="contained" color="primary">
            Add Note
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CaseManagement;