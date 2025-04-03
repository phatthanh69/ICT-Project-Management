import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Button,
  Box,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  AccessTime,
  AssignmentInd,
  Label,
  PriorityHigh,
  Schedule
} from '@mui/icons-material';

// Status colors
const statusColors = {
  OPEN: '#2196f3',
  PENDING_REVIEW: '#ff9800',
  IN_PROGRESS: '#9c27b0',
  AWAITING_CLIENT: '#f44336',
  ON_HOLD: '#ff5722',
  CLOSED: '#9e9e9e'
};

// Priority colors
const priorityColors = {
  LOW: '#4caf50',
  MEDIUM: '#ff9800',
  HIGH: '#f44336',
  URGENT: '#d32f2f'
};

const CaseCard = ({ caseData, onAction }) => {
  const navigate = useNavigate();
  const user = useSelector(state => state.auth.user);

  const {
    _id,
    caseNumber,
    type,
    status,
    priority,
    description,
    client,
    assignedSolicitor,
    createdAt,
    expectedResponseBy
  } = caseData;

  // Calculate time remaining for response
  const timeRemaining = new Date(expectedResponseBy) - new Date();
  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
  const isUrgent = hoursRemaining <= 12 && status === 'OPEN';

  const handleClick = () => {
    const basePath = user.role === 'client' ? '/client' : 
                    user.role === 'solicitor' ? '/solicitor' : '/admin';
    navigate(`${basePath}/cases/${_id}`);
  };

  return (
    <Card
      sx={{
        mb: 2,
        borderLeft: 6,
        borderColor: statusColors[status] || '#757575',
        '&:hover': {
          boxShadow: 3,
          cursor: 'pointer'
        }
      }}
    >
      <CardContent onClick={handleClick}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Typography variant="h6" component="div">
            {caseNumber}
          </Typography>
          <Box>
            <Chip
              size="small"
              label={status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
              sx={{
                backgroundColor: statusColors[status] || '#757575',
                color: 'white',
                mr: 1
              }}
            />
            <Chip
              size="small"
              label={priority.toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
              sx={{
                backgroundColor: priorityColors[priority] || '#757575',
                color: 'white'
              }}
            />
          </Box>
        </Box>

        <Typography color="textSecondary" gutterBottom>
          <Label sx={{ mr: 1, verticalAlign: 'middle' }} fontSize="small" />
          {type}
        </Typography>

        <Typography
          variant="body2"
          sx={{
            mt: 1,
            mb: 2,
            display: '-webkit-box',
            overflow: 'hidden',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 2
          }}
        >
          {description}
        </Typography>

        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            {client && (
              <Typography variant="body2" color="textSecondary">
                Client: {client.firstName} {client.lastName}
              </Typography>
            )}
            {assignedSolicitor && (
              <Typography variant="body2" color="textSecondary">
                Solicitor: {assignedSolicitor.firstName} {assignedSolicitor.lastName}
              </Typography>
            )}
          </Box>

          <Box display="flex" alignItems="center">
            <Tooltip title="Time remaining for response">
              <Box display="flex" alignItems="center" mr={2}>
                <Schedule fontSize="small" color={isUrgent ? 'error' : 'action'} />
                <Typography
                  variant="body2"
                  color={isUrgent ? 'error' : 'textSecondary'}
                  sx={{ ml: 0.5 }}
                >
                  {hoursRemaining}h
                </Typography>
              </Box>
            </Tooltip>
          </Box>
        </Box>
      </CardContent>

      {onAction && (
        <CardActions sx={{ justifyContent: 'flex-end' }}>
          {user.role === 'solicitor' && status === 'OPEN' && (
            <Button
              size="small"
              color="primary"
              startIcon={<AssignmentInd />}
              onClick={(e) => {
                e.stopPropagation();
                onAction('take', caseData);
              }}
            >
              Take Case
            </Button>
          )}
          {user.role === 'admin' && (
            <Button
              size="small"
              color="primary"
              onClick={(e) => {
                e.stopPropagation();
                onAction('assign', caseData);
              }}
            >
              Assign
            </Button>
          )}
        </CardActions>
      )}
    </Card>
  );
};

export default CaseCard;