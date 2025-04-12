import React from 'react';
import PropTypes from 'prop-types';
import { 
  Paper,
  Typography,
  Box,
  Divider,
  Chip
} from '@mui/material';
import { Droppable } from 'react-beautiful-dnd';
import KanbanCard from './KanbanCard';

const getLaneColor = (laneId) => {
  switch (laneId) {
    case 'OPEN': 
      return { light: '#e3f2fd', dark: '#2196f3' }; // Blue
    case 'IN_PROGRESS': 
      return { light: '#fff8e1', dark: '#ffc107' }; // Amber
    case 'PENDING_REVIEW': 
      return { light: '#e8f5e9', dark: '#4caf50' }; // Green
    case 'AWAITING_CLIENT': 
      return { light: '#f3e5f5', dark: '#9c27b0' }; // Purple
    case 'ON_HOLD': 
      return { light: '#fafafa', dark: '#9e9e9e' }; // Grey
    case 'CLOSED': 
      return { light: '#eeeeee', dark: '#616161' }; // Dark Grey
    default:
      return { light: '#e0e0e0', dark: '#757575' };
  }
};

const KanbanLane = ({ lane, userRole }) => {
  const colors = getLaneColor(lane.id);
  
  return (
    <Paper
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        bgcolor: colors.light,
        borderTop: `3px solid ${colors.dark}`,
      }}
      elevation={1}
    >
      <Box 
        sx={{
          p: 2,
          bgcolor: 'rgba(255, 255, 255, 0.7)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Typography variant="h6" fontWeight="medium">
          {lane.title}
        </Typography>
        <Chip 
          label={lane.cases.length}
          size="small"
          sx={{ bgcolor: colors.dark, color: 'white' }}
        />
      </Box>
      
      <Divider />
      
      <Droppable droppableId={lane.id}>
        {(provided, snapshot) => (
          <Box
            ref={provided.innerRef}
            {...provided.droppableProps}
            sx={{
              p: 2,
              flexGrow: 1,
              minHeight: '200px',
              overflowY: 'auto',
              transition: 'background-color 0.2s ease',
              bgcolor: snapshot.isDraggingOver 
                ? `${colors.light}` 
                : 'rgba(255, 255, 255, 0.5)',
              '&::-webkit-scrollbar': {
                width: '6px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '3px',
              }
            }}
          >
            {lane.cases.map((caseItem, index) => (
              <KanbanCard 
                key={caseItem.id} 
                caseData={caseItem} 
                userRole={userRole}
                index={index}
              />
            ))}
            {provided.placeholder}
            {lane.cases.length === 0 && (
              <Box
                sx={{
                  height: '100px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  color: 'text.secondary',
                  border: '1px dashed',
                  borderColor: 'divider',
                  borderRadius: 1,
                  mt: 1
                }}
              >
                <Typography variant="body2">
                  No cases in this column
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Droppable>
    </Paper>
  );
};

KanbanLane.propTypes = {
  lane: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    cases: PropTypes.array.isRequired
  }).isRequired,
  userRole: PropTypes.string.isRequired
};

export default KanbanLane;
