import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  Grid,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import CaseForm from '../../components/cases/CaseForm';
import DocumentUpload from '../../components/cases/DocumentUpload';
import axiosInstance from '../../utils/axios';

const CASE_TYPES = [
  { value: 'family', label: 'Family Law' },
  { value: 'immigration', label: 'Immigration' },
  { value: 'employment', label: 'Employment' },
  { value: 'housing', label: 'Housing' },
  { value: 'civil', label: 'Civil Law' },
  { value: 'criminal', label: 'Criminal Law' },
  { value: 'other', label: 'Other' }
];

const PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' }
];

const steps = ['Case Details', 'Review'];

const NewCase = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [caseData, setCaseData] = useState({});
  const [documents, setDocuments] = useState([]);
  const navigate = useNavigate();

  const handleNext = () => {
    // Validate form data before proceeding
    if (activeStep === 0) {
      if (!caseData.type || !caseData.description) {
        alert('Please fill in all required fields (type and description)');
        return;
      }
      
      const validTypes = ['family', 'immigration', 'housing', 'employment', 'civil', 'criminal', 'other'];
      if (!validTypes.includes(caseData.type)) {
        alert('Please select a valid case type');
        return;
      }
    }
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleCaseDataSubmit = (data) => {
    console.log('Case data submitted:', data);
    setCaseData(data);
    // Don't automatically go to next step, let the user choose when to proceed
  };

  const handleSubmit = async () => {
    try {
      // Validate required fields before submission
      if (!caseData.type || !caseData.description) {
        console.error('Missing required fields', caseData);
        alert('Please fill in all required fields (type and description)');
        return;
      }

      // Make sure type is one of the allowed values
      const validTypes = ['family', 'immigration', 'housing', 'employment', 'civil', 'criminal', 'other'];
      if (!validTypes.includes(caseData.type)) {
        console.error('Invalid case type:', caseData.type);
        alert('Please select a valid case type');
        return;
      }

      // Validate documents
      if (documents.length > 10) {
        alert('Maximum 10 documents allowed');
        return;
      }

      // Check file sizes
      const maxSize = 10 * 1024 * 1024; // 10MB
      const oversizedFiles = documents.filter(file => file.size > maxSize);
      if (oversizedFiles.length > 0) {
        alert(`Some files are too large (max 10MB): ${oversizedFiles.map(f => f.name).join(', ')}`);
        return;
      }

      // Create form data
      const formData = new FormData();
      
      // Append case data fields
      formData.append('type', caseData.type);
      formData.append('description', caseData.description);
      formData.append('priority', caseData.priority || 'MEDIUM');

      // Append documents if any
      if (documents.length > 0) {
        documents.forEach(file => {
          formData.append('documents', file);
        });
      }

      // Log submission details for debugging
      console.log('FormData contents:');
      for (let pair of formData.entries()) {
        console.log(pair[0], pair[1]);
      }

      // Send FormData without manually setting Content-Type
      // Let Axios handle the appropriate headers for FormData
      const response = await axiosInstance.post('/cases', formData);
      
      console.log('Case submitted successfully:', response.data);
      navigate('/client/cases');
    } catch (error) {
      console.error('Error submitting case:', error);
      console.error('Error details:', error.response?.data || error.message);
      
      const errorMessage = error.response?.data?.message || 
                          (error.response?.data?.errors ? 
                           error.response.data.errors.map(err => `${err.param}: ${err.msg}`).join('\n') : 
                           'Failed to submit case');
                           
      alert('Error: ' + errorMessage);
    }
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Case Information</Typography>
            <Paper sx={{ p: 3, mb: 3 }}>
              <CaseForm
                onSubmit={handleCaseDataSubmit}
                initialData={caseData}
                hideActions={true} // Hide the form's default buttons
              />
            </Paper>

            <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>Supporting Documents</Typography>
            <Paper sx={{ p: 3 }}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Please upload any relevant documents that support your case (PDF, Word documents, or images)
              </Typography>
              <DocumentUpload
                onFilesSelected={setDocuments}
                documents={documents}
                skipUpload={true} // Skip immediate upload during new case creation
              />
            </Paper>
          </Box>
        );
      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Review Your Case</Typography>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Case Details</Typography>
              {!caseData.type || !caseData.description ? (
                <Typography variant="body2" color="error">
                  Required information is missing. Please go back and complete the form.
                </Typography>
              ) : (
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">Type</Typography>
                    <Typography variant="body1" gutterBottom sx={{ ml: 1 }}>
                      {CASE_TYPES.find(t => t.value === caseData.type)?.label || caseData.type}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">Priority</Typography>
                    <Typography variant="body1" gutterBottom sx={{ ml: 1 }}>
                      {PRIORITIES.find(p => p.value === caseData.priority)?.label || 'Medium'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary">Description</Typography>
                    <Typography variant="body1" gutterBottom sx={{ ml: 1 }}>
                      {caseData.description}
                    </Typography>
                  </Grid>
                  {caseData.additionalNotes && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="textSecondary">Additional Notes</Typography>
                      <Typography variant="body1" gutterBottom sx={{ ml: 1 }}>
                        {caseData.additionalNotes}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              )}
            </Paper>
            
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Supporting Documents</Typography>
              <Box sx={{ mt: 2 }}>
                {documents && documents.length > 0 ? (
                  <Box>
                    <Typography variant="body2" color="primary" gutterBottom>
                      {documents.length} document{documents.length !== 1 ? 's' : ''} ready to submit
                    </Typography>
                    <List>
                      {documents.map((doc, index) => (
                        <ListItem key={index}>
                          <ListItemText
                            primary={doc.name}
                            secondary={`${(doc.size / 1024 / 1024).toFixed(2)} MB`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                ) : (
                  <Typography variant="body2" color="textSecondary">No documents attached</Typography>
                )}
              </Box>
            </Paper>
          </Box>
        );
      default:
        return 'Unknown step';
    }
  };

  return (
    <Container maxWidth="md">
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography component="h1" variant="h4" align="center" gutterBottom>
          Submit New Case
        </Typography>
        <Stepper activeStep={activeStep} sx={{ pt: 3, pb: 5 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        <React.Fragment>
          {getStepContent(activeStep)}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            {activeStep !== 0 && (
              <Button onClick={handleBack} sx={{ mr: 1 }}>
                Back
              </Button>
            )}
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleSubmit}
                color="primary"
              >
                Submit Case
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
                color="primary"
                disabled={!caseData.type || !caseData.description} // Disable if required fields are empty
              >
                Review Case
              </Button>
            )}
          </Box>
        </React.Fragment>
      </Paper>
    </Container>
  );
};

export default NewCase;