import React, { useState } from 'react';
import {
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondary,
  IconButton,
  Typography,
  Paper
} from '@mui/material';
import { Delete as DeleteIcon, Upload as UploadIcon } from '@mui/icons-material';

const DocumentUpload = ({ onDocumentsChange }) => {
  const [documents, setDocuments] = useState([]);

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    const newDocuments = [...documents, ...files];
    setDocuments(newDocuments);
    onDocumentsChange(newDocuments);
  };

  const handleRemoveFile = (index) => {
    const newDocuments = documents.filter((_, i) => i !== index);
    setDocuments(newDocuments);
    onDocumentsChange(newDocuments);
  };

  return (
    <Box>
      <input
        accept="application/pdf,image/*,.doc,.docx"
        style={{ display: 'none' }}
        id="document-upload"
        multiple
        type="file"
        onChange={handleFileSelect}
      />
      <label htmlFor="document-upload">
        <Button
          variant="contained"
          component="span"
          startIcon={<UploadIcon />}
          sx={{ mb: 2 }}
        >
          Upload Documents
        </Button>
      </label>

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