import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Flag as FlagIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

const KanbanCard = ({ caseData, userRole }) => {
  const navigate = useNavigate();

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'LOW': return 'success';
      case 'MEDIUM': return 'info';
      case 'HIGH': return 'warning';
      case 'URGENT': return 'error';
      default: return 'default';
    }
  };
  
  const getTypeLabel = (type) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const handleViewCase = () => {
    if (userRole === 'solicitor') {
      navigate(`/solicitor/cases/${caseData.id}`);
    } else if (userRole === 'client') {
      navigate(`/client/cases/${caseData.id}`);
    } else if (userRole === 'admin') {
      navigate(`/admin/cases/${caseData.id}`);
    }
  };

  return (
    <Card 
      sx={{ 
        mb: 2, 
        cursor: 'grab',
        '&:hover': {
          boxShadow: (theme) => theme.shadows[4],
          transform: 'translateY(-2px)',
          transition: 'all 0.2s ease-in-out'
        }
      }}
      elevation={2}
    >
      <CardContent sx={{ pb: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="subtitle1" component="div" noWrap>
            {caseData.caseNumber}
          </Typography>
          <Chip
            size="small"
            icon={<FlagIcon fontSize="small" />}
            label={caseData.priority}
            color={getPriorityColor(caseData.priority)}
          />
        </Box>
        
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            height: '40px',
            mb: 1
          }}
        >
          {caseData.description}
        </Typography>
        
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Chip 
            size="small" 
            label={getTypeLabel(caseData.type)} 
            variant="outlined" 
            sx={{ mr: 1 }}
          />
          <Typography variant="caption" color="text.secondary">
            {format(new Date(caseData.updatedAt), 'dd MMM yyyy')}
          </Typography>
        </Box>
        
        {caseData.client && (
          <Typography variant="caption" display="block" color="text.secondary" noWrap>
            Client: {caseData.client.name}
          </Typography>
        )}
        
        {caseData.solicitor && (
          <Typography variant="caption" display="block" color="text.secondary" noWrap>
            Solicitor: {caseData.solicitor.name}
          </Typography>
        )}
      </CardContent>
      
      <CardActions sx={{ justifyContent: 'flex-end', pt: 0, pb: 1, px: 2 }}>
        <Tooltip title="View Case Details">
          <IconButton size="small" onClick={handleViewCase}>
            <VisibilityIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
};

KanbanCard.propTypes = {
  caseData: PropTypes.object.isRequired,
  userRole: PropTypes.string.isRequired,
};

export default KanbanCard;
