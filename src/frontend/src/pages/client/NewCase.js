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

const steps = ['Case Details', 'Supporting Documents', 'Review'];

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

const NewCase = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [caseData, setCaseData] = useState({});
  const [documents, setDocuments] = useState([]);
  const navigate = useNavigate();

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleCaseDataSubmit = (data) => {
    console.log('Case data submitted:', data);
    setCaseData(data);
    handleNext();
  };

  const handleDocumentsSubmit = (files) => {
    setDocuments(files);
    handleNext();
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
        return <CaseForm onSubmit={handleCaseDataSubmit} initialData={caseData} />;
      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Upload Supporting Documents</Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Please upload any relevant documents that support your case (PDF, Word documents, or images)
            </Typography>
            <DocumentUpload onDocumentsChange={handleDocumentsSubmit} />
          </Box>
        );
      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Review Your Case</Typography>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Case Details</Typography>
              {Object.keys(caseData).length === 0 ? (
                <Typography variant="body2" color="error">No case data available. Please go back and complete the form.</Typography>
              ) : (
                <Grid container spacing={2}>
                  {Object.entries(caseData).map(([key, value]) => (
                    <Grid item xs={12} sm={6} key={key}>
                      <Typography variant="subtitle2" color="textSecondary">
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        {value || 'Not provided'}
                      </Typography>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Paper>
            
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Attached Documents</Typography>
              {documents.length > 0 ? (
                <List>
                  {documents.map((doc, index) => (
                    <ListItem key={index}>
                      <ListItemText primary={doc.name} secondary={`${(doc.size / 1024 / 1024).toFixed(2)} MB`} />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="textSecondary">No documents attached</Typography>
              )}
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
              >
                Next
              </Button>
            )}
          </Box>
        </React.Fragment>
      </Paper>
    </Container>
  );
};

export default NewCase;