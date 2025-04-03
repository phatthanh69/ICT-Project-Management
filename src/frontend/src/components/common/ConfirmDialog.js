import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box,
  useTheme
} from '@mui/material';
import {
  Close as CloseIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon
} from '@mui/icons-material';

const getIcon = (type) => {
  switch (type) {
    case 'warning':
      return <WarningIcon sx={{ color: 'warning.main', fontSize: 40 }} />;
    case 'error':
      return <ErrorIcon sx={{ color: 'error.main', fontSize: 40 }} />;
    case 'success':
      return <SuccessIcon sx={{ color: 'success.main', fontSize: 40 }} />;
    default:
      return <InfoIcon sx={{ color: 'info.main', fontSize: 40 }} />;
  }
};

const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title,
  content,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'info',
  loading = false,
  maxWidth = 'sm',
  confirmButtonProps = {},
  cancelButtonProps = {},
  children
}) => {
  const theme = useTheme();

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth={maxWidth}
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '200px'
        }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <Box display="flex" alignItems="center" flex={1} gap={1}>
            {getIcon(type)}
            <Typography variant="h6" component="span">
              {title}
            </Typography>
          </Box>
          {!loading && (
            <IconButton
              aria-label="close"
              onClick={onClose}
              sx={{
                position: 'absolute',
                right: 8,
                top: 8,
                color: theme.palette.grey[500]
              }}
            >
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      </DialogTitle>

      <DialogContent>
        {content && (
          <DialogContentText sx={{ mb: 2 }}>
            {content}
          </DialogContentText>
        )}
        {children}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onClose}
          disabled={loading}
          {...cancelButtonProps}
        >
          {cancelText}
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={loading}
          color={type === 'error' ? 'error' : 'primary'}
          {...confirmButtonProps}
        >
          {loading ? 'Please wait...' : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Example usage:
/*
  const [open, setOpen] = useState(false);
  const handleConfirm = async () => {
    // Handle confirmation action
  };

  <ConfirmDialog
    open={open}
    onClose={() => setOpen(false)}
    onConfirm={handleConfirm}
    title="Confirm Action"
    content="Are you sure you want to proceed with this action?"
    type="warning"
    loading={loading}
    confirmText="Proceed"
  />
*/

export default ConfirmDialog;