import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Typography,
  Paper,
  CircularProgress,
  Alert
} from '@mui/material';
import { Delete as DeleteIcon, Upload as UploadIcon } from '@mui/icons-material';
import axiosInstance from '../../utils/axios';

const DocumentUpload = ({ caseId, onUploadComplete, onFilesSelected, skipUpload, documents: existingDocs }) => {
  const [documents, setDocuments] = useState(existingDocs || []);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files);
    const newDocuments = [...documents, ...files];
    setDocuments(newDocuments);

    // If skipUpload is true or onFilesSelected is provided, just update the selected files
    if (skipUpload || onFilesSelected) {
      onFilesSelected?.(newDocuments);
      return;
    }

    // Otherwise, handle uploading to existing case
    try {
      if (!caseId) {
        throw new Error('Case ID is required for uploading documents');
      }

      setUploading(true);
      setError(null);

      const formData = new FormData();
      files.forEach(file => {
        formData.append('documents', file);
      });

      const response = await axiosInstance.post(
        `/cases/${caseId}/documents`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      setDocuments([...documents, ...files]);
      if (onUploadComplete) {
        onUploadComplete(response.data);
      }
    } catch (err) {
      console.error('Error uploading documents:', err);
      setError(err.response?.data?.message || 'Error uploading documents');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    // Update documents state when existingDocs prop changes
    if (existingDocs) {
      setDocuments(existingDocs);
    }
  }, [existingDocs]);

  const handleRemoveFile = (index) => {
    const newDocuments = documents.filter((_, i) => i !== index);
    setDocuments(newDocuments);
    // Notify parent about document removal
    if (onFilesSelected) {
      onFilesSelected(newDocuments);
    }
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box display="flex" justifyContent="flex-start" alignItems="center" mb={3}>
        <input
          accept="application/pdf,image/*,.doc,.docx"
          style={{ display: 'none' }}
          id="document-upload"
          multiple
          type="file"
          onChange={handleFileSelect}
          disabled={uploading}
        />
        <label htmlFor="document-upload">
          <Button
            variant="contained"
            color="primary"
            size="large"
            component="span"
            startIcon={uploading ? <CircularProgress size={20} /> : <UploadIcon />}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload Documents'}
          </Button>
        </label>
      </Box>

      <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Uploaded Documents
        </Typography>
        <List>
          {documents.length === 0 ? (
            <ListItem>
              <ListItemText secondary="No documents uploaded yet" />
            </ListItem>
          ) : (
            documents.map((file, index) => (
              <ListItem
                key={index}
                secondaryAction={
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={() => handleRemoveFile(index)}
                  >
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={file.name}
                  secondary={`${(file.size / 1024 / 1024).toFixed(2)} MB`}
                />
              </ListItem>
            ))
          )}
        </List>
      </Paper>
    </Box>
  );
};

export default DocumentUpload;