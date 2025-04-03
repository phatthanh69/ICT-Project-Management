const express = require('express');
const router = express.Router();
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('./auth');
const mongoose = require('mongoose');
const Case = require('../models/Case');
const User = require('../models/User');
const Solicitor = require('../models/Solicitor');
const Client = require('../models/Client');

// Configure multer for file upload
const upload = multer();

// Middleware to check if user has access to case
const checkCaseAccess = async (req, res, next) => {
  try {
    const caseId = req.params.id;
    const userId = req.user._id; // Changed from req.user.userId
    const userRole = req.user.role;

    const caseItem = await Case.findById(caseId);
    if (!caseItem) {
      return res.status(404).json({ message: 'Case not found' });
    }

    // Admin has access to all cases
    if (userRole === 'admin') {
      req.caseItem = caseItem;
      return next();
    }

    // Client can only access their own cases
    if (userRole === 'client' && caseItem.client.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Solicitor can access assigned cases or cases matching their specialization
    if (userRole === 'solicitor') {
      const solicitor = await Solicitor.findById(userId);
      if (caseItem.assignedSolicitor?.toString() !== userId &&
          !solicitor.specializations.includes(caseItem.type)) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    req.caseItem = caseItem;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Error checking case access' });
  }
};

// Create new case
router.post('/',
  authenticateToken,
  upload.array('documents'),
  [
    body('type')
      .isIn([
        'family', 'immigration', 'housing', 'employment',
        'civil', 'criminal', 'other'
      ])
      .withMessage('Invalid case type'),
    body('description')
      .trim()
      .notEmpty()
      .withMessage('Description is required'),
    body('priority')
      .optional()
      .isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
      .withMessage('Invalid priority level')
  ],
  async (req, res) => {
    try {
      console.log('Received form data:', req.body);
      console.log('Received files:', req.files?.length || 0);
      console.log('User info:', req.user);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('Validation errors:', errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      // Validate user role is client or admin
      if (req.user.role !== 'client' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Only clients or admins can create cases' });
      }

      // Ensure userId is available
      if (!req.user._id) {
        console.error('No user ID available in request');
        return res.status(400).json({
          message: 'User identification error',
          errors: [{ field: 'client', message: 'Client identification is missing' }]
        });
      }

      // Create new case with validated data
      const newCase = new Case({
        type: req.body.type,
        description: req.body.description,
        priority: req.body.priority || 'MEDIUM',
        client: req.user._id, // Must be present due to validation above
        status: 'OPEN',
        timeline: [{
          action: 'Case created',
          actor: req.user._id, // Changed from req.user.userId
          notes: 'New case submitted'
        }]
      });

      // Handle file uploads if any
      if (req.files && req.files.length > 0) {
        console.log('Processing files:', req.files.length);
        // Here you would process the files, perhaps upload them to storage
        // and add their references to the case
      }

      await newCase.save();
      console.log('Case created successfully:', newCase._id);

      res.status(201).json(newCase);
    } catch (error) {
      console.error('Error creating case:', error);
      
      // Improved error handling for validation errors from Mongoose
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }));
        
        // Log more details for debugging
        console.error('Validation error details:', JSON.stringify(validationErrors));
        
        return res.status(400).json({ 
          message: 'Validation error',
          errors: validationErrors
        });
      }
      
      res.status(500).json({ message: 'Error creating case: ' + error.message });
    }
});

// Get cases with filters
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { type, status, priority, search, client } = req.query;
    const userRole = req.user.role;
    const userId = req.user._id;

    let query = {};

    // Build query based on filters
    if (type) query.type = type;
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (search) {
      query.$or = [
        { caseNumber: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Apply role-based filters and handle client parameter
    if (userRole === 'admin' && client) {
      // Admin can view cases for any client
      query.client = client;
    } else if (userRole === 'client') {
      // Clients can only view their own cases
      query.client = userId;
    } else if (userRole === 'solicitor') {
      // Fetch solicitor details for specialization check
      const solicitor = await Solicitor.findById(userId);
      if (!solicitor) {
        console.error('Solicitor not found:', userId);
        return res.status(404).json({ message: 'Solicitor not found' });
      }

      query.$or = [
        { assignedSolicitor: userId },
        {
          type: { $in: solicitor.specializations },
          status: 'OPEN'
        }
      ];
    }

    // Calculate pagination data
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;

    // Validate client ObjectId if provided
    if (query.client && !mongoose.Types.ObjectId.isValid(query.client)) {
      console.error('Invalid client ID:', query.client);
      return res.status(400).json({ message: 'Invalid client ID' });
    }

    // Get total count for pagination
    const totalCases = await Case.countDocuments(query);
    const totalPages = Math.ceil(totalCases / limit);

    // Fetch paginated cases with populated fields
    const paginatedCases = await Case.find(query)
      .populate('client', 'firstName lastName email')
      .populate('assignedSolicitor', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    res.json({
      cases: paginatedCases,
      currentPage: page,
      totalPages,
      totalCases
    });
  } catch (error) {
    console.error('Error fetching cases:', error, error.stack);
    res.status(500).json({
      message: 'Error fetching cases',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get specific case
router.get('/:id', authenticateToken, checkCaseAccess, async (req, res) => {
  try {
    const caseItem = await req.caseItem
      .populate('client', 'firstName lastName email phone')
      .populate('assignedSolicitor', 'firstName lastName email phone specializations')
      .populate('timeline.actor', 'firstName lastName role')
      .populate('notes.createdBy', 'firstName lastName role');

    res.json(caseItem);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching case details' });
  }
});

// Update case
router.patch('/:id', 
  authenticateToken,
  checkCaseAccess,
  async (req, res) => {
    try {
      const allowedUpdates = ['status', 'priority', 'description', 'notes'];
      
      // Validate status if it's being updated
      if (req.body.status && !['OPEN', 'IN_PROGRESS', 'CLOSED', 'PENDING_REVIEW', 'AWAITING_CLIENT', 'ON_HOLD'].includes(req.body.status)) {
        return res.status(400).json({ message: 'Invalid status value' });
      }
      
      // Validate priority if it's being updated
      if (req.body.priority && !['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(req.body.priority)) {
        return res.status(400).json({ message: 'Invalid priority value' });
      }
      const updates = Object.keys(req.body)
        .filter(key => allowedUpdates.includes(key))
        .reduce((obj, key) => {
          obj[key] = req.body[key];
          return obj;
        }, {});

      // Add timeline entry
      req.caseItem.timeline.push({
        action: 'Case updated',
        actor: req.user._id, // Changed from req.user.userId
        notes: `Updated: ${Object.keys(updates).join(', ')}`
      });

      Object.assign(req.caseItem, updates);
      await req.caseItem.save();

      res.json(req.caseItem);
    } catch (error) {
      res.status(500).json({ message: 'Error updating case' });
    }
});

// Assign solicitor to case
router.post('/:id/assign', 
  authenticateToken,
  checkCaseAccess,
  async (req, res) => {
    try {
      const { solicitorId } = req.body;
      
      // Check if solicitor exists and can take new cases
      const solicitor = await Solicitor.findById(solicitorId);
      if (!solicitor || !solicitor.canTakeNewCase()) {
        return res.status(400).json({ 
          message: 'Solicitor cannot take new cases at this time' 
        });
      }

      // Update case
      req.caseItem.assignedSolicitor = solicitorId;
      req.caseItem.status = 'IN_PROGRESS';
      req.caseItem.timeline.push({
        action: 'Case assigned to solicitor',
        actor: req.user._id, // Changed from req.user.userId
        notes: `Case assigned to ${solicitor.firstName} ${solicitor.lastName}`
      });

      await req.caseItem.save();

      // Update solicitor's current cases
      solicitor.availability.currentCases.push(req.caseItem._id);
      await solicitor.save();

      res.json(req.caseItem);
    } catch (error) {
      res.status(500).json({ message: 'Error assigning solicitor' });
    }
});

// Add note to case
router.post('/:id/notes',
  authenticateToken,
  checkCaseAccess,
  [body('content').trim().notEmpty()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { content, isInternal = false } = req.body;

      req.caseItem.notes.push({
        content,
        createdBy: req.user._id, // Changed from req.user.userId
        isPrivate: isInternal,
        createdAt: new Date()
      });

      req.caseItem.timeline.push({
        action: 'Note added',
        actor: req.user._id, // Changed from req.user.userId
        notes: isInternal ? 'Internal note added' : 'Note added'
      });

      await req.caseItem.save();
      res.json(req.caseItem);
    } catch (error) {
      res.status(500).json({ message: 'Error adding note' });
    }
});

module.exports = router;