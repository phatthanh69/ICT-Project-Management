import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { format } from 'date-fns';
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
  TextField,
} from '@mui/material';
import axiosInstance from '../../utils/axios';
import CaseTimeline from '../../components/cases/CaseTimeline';
import DocumentUpload from '../../components/cases/DocumentUpload';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const CaseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useSelector(state => state.auth.user);
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [noteContent, setNoteContent] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '' });

  // Fetch case details
  useEffect(() => {
    const fetchCaseDetails = async () => {
      try {
        const response = await axiosInstance.get(`/cases/${id}`);
        setCaseData(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching case details:', err);
        setError(err.response?.data?.message || 'Error fetching case details');
        setLoading(false);
      }
    };
    
    fetchCaseDetails();
  }, [id]);

  const getStatusColor = (status) => {
    if (!status) return 'default';
    const statusStr = status.toLowerCase();
    switch (statusStr) {
      case 'open': return 'info';
      case 'in_progress': return 'warning';
      case 'closed': return 'success';
      case 'on_hold': return 'error';
      default: return 'default';
    }
  };

  const formatStatus = (status) => {
    if (!status) return 'Unknown';
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      return format(new Date(dateString), 'PPP');
    } catch (err) {
      console.error('Date formatting error:', err);
      return 'Invalid Date';
    }
  };

  // Handle status update
  const handleStatusUpdate = async (newStatus) => {
    try {
      const response = await axiosInstance.patch(`/cases/${id}`, { status: newStatus });
      setCaseData(response.data);
    } catch (err) {
      console.error('Error updating case status:', err);
      setError(err.response?.data?.message || 'Error updating case status');
    }
  };

  // Handle note submission
  const handleNoteSubmit = async (e) => {
    e.preventDefault();
    if (!noteContent.trim()) return;

    try {
      const response = await axiosInstance.post(`/cases/${id}/notes`, {
        content: noteContent,
        isInternal: user.role === 'solicitor' || user.role === 'admin'
      });
      setCaseData(response.data);
      setNoteContent('');
    } catch (err) {
      console.error('Error adding note:', err);
      setError(err.response?.data?.message || 'Error adding note');
    }
  };

  // Handle case assignment (for solicitors)
  const handleCaseAccept = async () => {
    if (user.role !== 'solicitor') return;

    try {
      const response = await axiosInstance.post(`/cases/${id}/accept`);
      setCaseData(response.data);
    } catch (err) {
      console.error('Error accepting case:', err);
      setError(err.response?.data?.message || 'Error accepting case');
    }
  };

  const handleBackToList = () => {
    const basePath = user.role === 'admin' ? '/admin' : 
                    user.role === 'solicitor' ? '/solicitor' : 
                    '/client';
    navigate(`${basePath}/cases`);
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
        <Alert severity="warning">Case not found</Alert>
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

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={8}>
            <Typography variant="h4" component="h1">
              Case: {caseData.caseNumber}
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Chip
              label={formatStatus(caseData.status)}
              color={getStatusColor(caseData.status)}
              sx={{ mr: 1 }}
            />
            <Chip label={caseData.priority} color="secondary" />
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Type: {caseData.type?.charAt(0).toUpperCase() + caseData.type?.slice(1)}
            </Typography>
            <Typography variant="subtitle1" gutterBottom>
              Created: {formatDate(caseData.createdAt)}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Updated: {formatDate(caseData.updatedAt)}
            </Typography>
            {caseData.expectedResponseBy && (
              <Typography variant="subtitle1" gutterBottom>
                Expected Response: {formatDate(caseData.expectedResponseBy)}
              </Typography>
            )}
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Description:
            </Typography>
            <Typography variant="body1">
              {caseData.description}
            </Typography>
          </Grid>
        </Grid>

        {/* Role-based actions */}
        {(user.role === 'admin' || user.role === 'solicitor') && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={1}>
              {user.role === 'solicitor' && !caseData.assignedSolicitor && (
                <Grid item>
                  <Button variant="contained" color="primary" onClick={handleCaseAccept}>
                    Accept Case
                  </Button>
                </Grid>
              )}
              <Grid item>
                <Button
                  variant="outlined"
                  color="success"
                  onClick={() => handleStatusUpdate('OPEN')}
                  disabled={caseData.status === 'OPEN'}
                >
                  Open Case
                </Button>
              </Grid>
              <Grid item>
                <Button
                  variant="outlined"
                  onClick={() => handleStatusUpdate('IN_PROGRESS')}
                  disabled={caseData.status === 'IN_PROGRESS'}
                >
                  Mark In Progress
                </Button>
              </Grid>
              <Grid item>
                <Button
                  variant="outlined"
                  onClick={() => handleStatusUpdate('ON_HOLD')}
                  disabled={caseData.status === 'ON_HOLD'}
                >
                  Put On Hold
                </Button>
              </Grid>
              <Grid item>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => handleStatusUpdate('CLOSED')}
                  disabled={caseData.status === 'CLOSED'}
                >
                  Close Case
                </Button>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          {/* Client Information */}
          <Card sx={{ mb: 3 }}>
            <CardHeader title="Client Information" />
            <CardContent>
              {caseData.client && caseData.client.User ? (
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="Email"
                      secondary={caseData.client.User.email}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Address"
                      secondary={`${caseData.client.street}, ${caseData.client.city}, ${caseData.client.postcode}`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Employment Status"
                      secondary={caseData.client.employmentStatus || 'N/A'}
                    />
                  </ListItem>
                </List>
              ) : (
                <Typography>No client information available</Typography>
              )}
            </CardContent>
          </Card>

          {/* Solicitor Information */}
          <Card>
            <CardHeader title="Assigned Solicitor" />
            <CardContent>
              {caseData.assignedSolicitor ? (
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="Email"
                      secondary={caseData.assignedSolicitor.User.email}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Firm"
                      secondary={caseData.assignedSolicitor.firmName}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Phone"
                      secondary={caseData.assignedSolicitor.firmPhone || 'N/A'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Experience"
                      secondary={`${caseData.assignedSolicitor.yearsOfExperience} years`}
                    />
                  </ListItem>
                </List>
              ) : (
                <Typography>No solicitor assigned</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          {/* Timeline */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Case Timeline
            </Typography>
            <CaseTimeline activities={caseData.activities || []} />
          </Paper>

          {/* Notes */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Case Notes
            </Typography>
            <form onSubmit={handleNoteSubmit}>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Add a note..."
                margin="normal"
              />
              <Button type="submit" variant="contained" sx={{ mt: 1 }}>
                Add Note
              </Button>
            </form>
            <List>
              {caseData.notes && caseData.notes.map(note => (
                <ListItem key={note.id} divider>
                  <ListItemText
                    primary={note.content}
                    secondary={`Added by ${note.author.role} - ${formatDate(note.createdAt)}`}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>

          {/* Documents */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Documents
            </Typography>
            <DocumentUpload caseId={id} />
          </Paper>
        </Grid>
      </Grid>

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
      />
    </Container>
  );
};

export default CaseDetails;