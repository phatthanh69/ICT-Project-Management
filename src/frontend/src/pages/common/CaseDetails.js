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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: null });
  const [availableSolicitors, setAvailableSolicitors] = useState([]);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [selectedSolicitor, setSelectedSolicitor] = useState(null);
  
  // Fetch available solicitors for reassignment
  const fetchAvailableSolicitors = async () => {
    try {
      const response = await axiosInstance.get('/solicitors', {
        params: { verified: true, active: true }
      });
      setAvailableSolicitors(response.data);
    } catch (err) {
      console.error('Error fetching solicitors:', err);
      setError('Failed to load available solicitors');
    }
  };

  // Open reassign dialog
  const handleOpenReassign = () => {
    fetchAvailableSolicitors();
    setReassignDialogOpen(true);
  };

  // Handle reassignment
  const handleReassign = (solicitorId) => {
    setConfirmDialog({
      open: true,
      title: 'Confirm Reassignment',
      message: 'Are you sure you want to reassign this case to the selected solicitor?',
      onConfirm: () => handleCaseReassign(solicitorId)
    });
  };

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

  // Handle case reassignment
  const handleCaseReassign = async (solicitorId = null) => {
    try {
      const response = await axiosInstance.post(`/cases/${id}/reassign`, { solicitorId });
      setCaseData(response.data);
      setReassignDialogOpen(false);
      setSelectedSolicitor(null);
    } catch (err) {
      console.error('Error reassigning case:', err);
      setError(err.response?.data?.message || 'Error reassigning case');
    }
  };

  // Handle unassign confirmation
  const confirmUnassign = () => {
    setConfirmDialog({
      open: true,
      title: 'Unassign Case',
      message: 'Are you sure you want to unassign this case? It will become available for other solicitors.',
      onConfirm: () => handleCaseReassign(null)
    });
  };

  // Handle status update
  const handleStatusUpdate = async (newStatus) => {
    if (user.role !== 'admin' && user.role !== 'solicitor') {
      setError('You do not have permission to update case status');
      return;
    }
    
    if (user.role === 'solicitor' && 
        (!caseData.assignedSolicitor || caseData.assignedSolicitor.User.id !== user.id)) {
      setError('You must be assigned to this case to update its status');
      return;
    }
    
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
    if (user.role === 'solicitor') {
      navigate('/solicitor/my-cases');
    } else {
      const basePath = user.role === 'admin' ? '/admin' : '/client';
      navigate(`${basePath}/cases`);
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
            <Grid container spacing={2}>
              {/* Status Actions */}
              <Grid item xs={12}>
                <Grid container spacing={1}>
                  {user.role === 'solicitor' && (!caseData.assignedSolicitor || caseData.assignedSolicitor.User.id !== user.id) ? (
                    // Show only Accept Case button if solicitor hasn't accepted yet
                    <Grid item>
                      <Button variant="contained" color="primary" onClick={handleCaseAccept}>
                        Accept Case
                      </Button>
                    </Grid>
                  ) : (
                    // Show status action buttons based on user role
                    <>
                      {/* Open Case button - Admin only */}
                      {user.role === 'admin' && (
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
                      )}
                      
                      {/* Other status buttons - Admin or assigned solicitor */}
                      {(user.role === 'admin' || (user.role === 'solicitor' && caseData.assignedSolicitor && caseData.assignedSolicitor.User.id === user.id)) && (
                        <>
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
                        </>
                      )}
                    </>
                  )}
                </Grid>
              </Grid>

              {/* Admin Assignment Actions */}
              {user.role === 'admin' && caseData.assignedSolicitor && (
                <Grid item xs={12}>
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="outlined"
                      color="warning"
                      onClick={confirmUnassign}
                      sx={{ mr: 1 }}
                    >
                      Unassign Current Solicitor
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleOpenReassign}
                    >
                      Reassign to Different Solicitor
                    </Button>
                  </Box>
                </Grid>
              )}
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

      {/* Solicitor Reassignment Dialog */}
      <Dialog
        open={reassignDialogOpen}
        onClose={() => setReassignDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Reassign Case to Solicitor</DialogTitle>
        <DialogContent>
          {availableSolicitors.length > 0 ? (
            <List>
              {availableSolicitors.map((solicitor) => (
                <ListItem
                  key={solicitor.id}
                  button
                  onClick={() => {
                    setSelectedSolicitor(solicitor);
                    setReassignDialogOpen(false);
                    handleReassign(solicitor.id);
                  }}
                  divider
                >
                  <ListItemText
                    primary={`${solicitor.User.firstName} ${solicitor.User.lastName}`}
                    secondary={
                      <>
                        <Typography variant="body2" color="textPrimary">
                          {solicitor.firmName}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Specializations: {solicitor.specializations.join(', ')}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Experience: {solicitor.yearsOfExperience} years
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography>No available solicitors found</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReassignDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Dialog */}
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