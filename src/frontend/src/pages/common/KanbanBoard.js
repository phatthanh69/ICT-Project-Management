import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DragDropContext } from 'react-beautiful-dnd';
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Snackbar,
  useMediaQuery
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import KanbanLane from '../../components/kanban/KanbanLane';
import { 
  fetchKanbanBoard, 
  moveKanbanCard, 
  selectKanbanLanes, 
  selectKanbanLoading, 
  selectKanbanError,
  selectMovingCard,
  clearKanbanError
} from '../../redux/slices/kanbanSlice';

const KanbanBoard = () => {
  const dispatch = useDispatch();
  const lanes = useSelector(selectKanbanLanes);
  const loading = useSelector(selectKanbanLoading);
  const error = useSelector(selectKanbanError);
  const movingCard = useSelector(selectMovingCard);
  const user = useSelector(state => state.auth.user);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  const isMobile = useMediaQuery(theme => theme.breakpoints.down('sm'));

  useEffect(() => {
    dispatch(fetchKanbanBoard());
  }, [dispatch]);

  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;

    // Dropped outside a droppable area
    if (!destination) return;

    // Dropped in the same position
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) return;

    // If it was moved to a different lane
    if (source.droppableId !== destination.droppableId) {
      dispatch(moveKanbanCard({
        caseId: draggableId,
        newStatus: destination.droppableId
      }))
        .unwrap()
        .then(() => {
          setNotification({
            open: true,
            message: 'Case moved successfully',
            severity: 'success'
          });
        })
        .catch(error => {
          setNotification({
            open: true,
            message: error || 'Failed to move case',
            severity: 'error'
          });
        });
    }
  };

  const handleRefresh = () => {
    dispatch(fetchKanbanBoard());
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  const handleCloseError = () => {
    dispatch(clearKanbanError());
  };

  if (loading && lanes.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="70vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 5 }}>
      <Box mb={3} display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap">
        <Typography variant="h4" component="h1">
          Kanban Board
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={handleCloseError} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {movingCard && (
        <Box mb={2} display="flex" alignItems="center">
          <CircularProgress size={20} sx={{ mr: 1 }} />
          <Typography variant="body2">Moving case...</Typography>
        </Box>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: isMobile 
              ? '1fr'
              : { md: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' },
            gap: 2,
            overflowX: isMobile ? 'auto' : 'visible',
            pb: 1
          }}
        >
          {lanes.map(lane => (
            <Box 
              key={lane.id}
              sx={{ 
                minWidth: isMobile ? '90vw' : 'auto',
                height: isMobile ? 'auto' : '75vh'
              }}
            >
              <KanbanLane lane={lane} userRole={user.role} />
            </Box>
          ))}
        </Box>
      </DragDropContext>

      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={handleCloseNotification}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default KanbanBoard;
