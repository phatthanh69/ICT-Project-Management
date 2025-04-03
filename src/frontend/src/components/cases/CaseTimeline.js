import React from 'react';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent
} from '@mui/lab';
import {
  Paper,
  Typography,
  Box,
  IconButton,
  Tooltip,
  useTheme
} from '@mui/material';
import {
  Create as CreateIcon,
  Assignment as AssignmentIcon,
  Chat as ChatIcon,
  Update as UpdateIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  AttachFile as AttachFileIcon
} from '@mui/icons-material';

const getTimelineIcon = (action) => {
  switch (action.toLowerCase()) {
    case 'case created':
      return <CreateIcon />;
    case 'solicitor assigned':
      return <AssignmentIcon />;
    case 'note added':
      return <ChatIcon />;
    case 'status updated':
      return <UpdateIcon />;
    case 'case resolved':
      return <CheckCircleIcon />;
    case 'deadline updated':
      return <ScheduleIcon />;
    case 'document added':
      return <AttachFileIcon />;
    default:
      return <ErrorIcon />;
  }
};

const getTimelineColor = (action) => {
  switch (action.toLowerCase()) {
    case 'case created':
      return 'primary';
    case 'solicitor assigned':
      return 'success';
    case 'note added':
      return 'info';
    case 'status updated':
      return 'warning';
    case 'case resolved':
      return 'success';
    case 'deadline updated':
      return 'warning';
    case 'document added':
      return 'info';
    default:
      return 'grey';
  }
};

const formatDate = (date) => {
  return new Date(date).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const CaseTimeline = ({ events }) => {
  const theme = useTheme();

  if (!events || events.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="textSecondary">
          No timeline events available
        </Typography>
      </Box>
    );
  }

  return (
    <Timeline position="alternate">
      {events.map((event, index) => (
        <TimelineItem key={index}>
          <TimelineOppositeContent>
            <Typography variant="body2" color="textSecondary">
              {formatDate(event.date)}
            </Typography>
          </TimelineOppositeContent>
          
          <TimelineSeparator>
            <TimelineDot color={getTimelineColor(event.action)}>
              {getTimelineIcon(event.action)}
            </TimelineDot>
            {index < events.length - 1 && <TimelineConnector />}
          </TimelineSeparator>
          
          <TimelineContent>
            <Paper
              elevation={1}
              sx={{
                p: 2,
                backgroundColor: theme.palette.background.default,
                maxWidth: 400
              }}
            >
              <Typography variant="h6" component="h3">
                {event.action}
              </Typography>
              
              {event.actor && (
                <Typography variant="body2" color="textSecondary">
                  By: {event.actor.firstName} {event.actor.lastName}
                  {event.actor.role && ` (${event.actor.role})`}
                </Typography>
              )}
              
              {event.notes && (
                <Typography
                  variant="body2"
                  sx={{
                    mt: 1,
                    color: theme.palette.text.secondary,
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {event.notes}
                </Typography>
              )}

              {event.document && (
                <Box sx={{ mt: 1 }}>
                  <Tooltip title="View Document">
                    <IconButton
                      size="small"
                      onClick={() => window.open(event.document.fileUrl, '_blank')}
                    >
                      <AttachFileIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Typography variant="caption" sx={{ ml: 1 }}>
                    {event.document.title}
                  </Typography>
                </Box>
              )}
            </Paper>
          </TimelineContent>
        </TimelineItem>
      ))}
    </Timeline>
  );
};

export default CaseTimeline;