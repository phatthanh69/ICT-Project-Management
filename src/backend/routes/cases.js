const express = require('express');
const router = express.Router();
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('./auth');
const { Op } = require('sequelize');
const { Case, User, Solicitor, Client, Timeline, Note } = require('../models');

// Configure multer for file upload
const upload = multer();

// Middleware to check if user has access to case
const checkCaseAccess = async (req, res, next) => {
  try {
    const caseId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    const caseItem = await Case.findByPk(caseId, {
      include: [
        { model: Timeline },
        { model: Note }
      ]
    });
    
    if (!caseItem) {
      return res.status(404).json({ message: 'Case not found' });
    }

    // Admin has access to all cases
    if (userRole === 'admin') {
      req.caseItem = caseItem;
      return next();
    }

    // Client can only access their own cases
    if (userRole === 'client' && caseItem.clientId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Solicitor can access assigned cases or cases matching their specialization
    if (userRole === 'solicitor') {
      const solicitor = await Solicitor.findByPk(userId);
      if (caseItem.assignedSolicitorId !== userId &&
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
  // Move case access check after auth but before file upload
  async (req, res, next) => {
    // Check if user is a client or admin
    if (req.user.role !== 'client' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only clients or admins can create cases' });
    }
    next();
  },
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


      // Ensure userId is available
      if (!req.user.id) {
        console.error('No user ID available in request');
        return res.status(400).json({
          message: 'User identification error',
          errors: [{ field: 'client', message: 'Client identification is missing' }]
        });
      }

      // Create new case with validated data using Sequelize transaction
      const newCase = await Case.create({
        type: req.body.type,
        description: req.body.description,
        priority: req.body.priority || 'MEDIUM',
        clientId: req.user.id,
        status: 'OPEN'
      });

      // Create timeline entry
      await Timeline.create({
        caseId: newCase.id,
        action: 'Case created',
        actorId: req.user.id,
        notes: 'New case submitted'
      });

      // Handle file uploads if any
      if (req.files && req.files.length > 0) {
        console.log('Processing files:', req.files.length);
        // Here you would process the files, perhaps upload them to storage
        // and add their references to the case
      }

      console.log('Case created successfully:', newCase.id);

      // Fetch the created case with associated timeline
      const createdCase = await Case.findByPk(newCase.id, {
        include: [{ model: Timeline }]
      });

      res.status(201).json(createdCase);
    } catch (error) {
      console.error('Error creating case:', error);
      
      // Improved error handling for validation errors from Sequelize
      if (error.name === 'SequelizeValidationError') {
        const validationErrors = error.errors.map(err => ({
          field: err.path,
          message: err.message
        }));
        
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
    const { type, status, priority, search, client, assigned } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;

    let where = {};
    let include = [
      { model: User, as: 'client', attributes: ['id', 'firstName', 'lastName', 'email'] },
      { model: User, as: 'assignedSolicitor', attributes: ['id', 'firstName', 'lastName', 'email'] }
    ];

    // Build query based on filters
    if (type) where.type = type;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (search) {
      where[Op.or] = [
        { caseNumber: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Apply role-based filters and handle client parameter
    if (userRole === 'admin' && client) {
      // Admin can view cases for any client
      where.clientId = client;
    } else if (userRole === 'client') {
      // Clients can only view their own cases
      where.clientId = userId;
    } else if (userRole === 'solicitor') {
      // Handle solicitor-specific queries
      if (assigned === 'true') {
        // Only show cases assigned to this solicitor (my-caseload)
        where.assignedSolicitorId = userId;
      } else {
        // Fetch solicitor details for specialization check
        const solicitor = await Solicitor.findByPk(userId);
        if (!solicitor) {
          console.error('Solicitor not found:', userId);
          return res.status(404).json({ message: 'Solicitor not found' });
        }

        where[Op.or] = [
          { assignedSolicitorId: userId },
          {
            type: { [Op.in]: solicitor.specializations },
            status: 'OPEN',
            assignedSolicitorId: null
          }
        ];
      }
    }

    // Calculate pagination data
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Get total count for pagination and fetch cases
    const { count: totalCases, rows: paginatedCases } = await Case.findAndCountAll({
      where,
      include,
      order: [['createdAt', 'DESC']],
      offset,
      limit
    });

    const totalPages = Math.ceil(totalCases / limit);

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
    const caseItem = await Case.findByPk(req.caseItem.id, {
      include: [
        { 
          model: User, 
          as: 'client', 
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] 
        },
        { 
          model: User, 
          as: 'assignedSolicitor',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
          model: Timeline,
          include: [
            { model: User, as: 'actor', attributes: ['id', 'firstName', 'lastName', 'role'] }
          ]
        },
        {
          model: Note,
          include: [
            { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName', 'role'] }
          ]
        }
      ]
    });

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
      const allowedUpdates = ['status', 'priority', 'description'];
      
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
      await Timeline.create({
        caseId: req.caseItem.id,
        action: 'Case updated',
        actorId: req.user.id,
        notes: `Updated: ${Object.keys(updates).join(', ')}`
      });

      // Update case
      await req.caseItem.update(updates);
      
      // Fetch updated case with associations
      const updatedCase = await Case.findByPk(req.caseItem.id, {
        include: [
          { model: Timeline },
          { model: Note }
        ]
      });

      res.json(updatedCase);
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
      const solicitor = await Solicitor.findByPk(solicitorId);
      if (!solicitor || !await solicitor.canTakeNewCase()) {
        return res.status(400).json({ 
          message: 'Solicitor cannot take new cases at this time' 
        });
      }

      // Update case
      await req.caseItem.update({
        assignedSolicitorId: solicitorId,
        status: 'IN_PROGRESS'
      });

      // Add timeline entry
      await Timeline.create({
        caseId: req.caseItem.id,
        action: 'Case assigned to solicitor',
        actorId: req.user.id,
        notes: `Case assigned to ${solicitor.firstName} ${solicitor.lastName}`
      });

      // Update solicitor's current cases
      await solicitor.addCase(req.caseItem.id);

      // Fetch updated case with associations
      const updatedCase = await Case.findByPk(req.caseItem.id, {
        include: [
          { model: Timeline },
          { model: Note },
          { 
            model: User, 
            as: 'assignedSolicitor',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] 
          }
        ]
      });

      res.json(updatedCase);
    } catch (error) {
      res.status(500).json({ message: 'Error assigning solicitor' });
    }
});

// Accept a case (for solicitors)
router.post('/:id/accept',
  authenticateToken,
  // Add access check for solicitor before case acceptance
  async (req, res, next) => {
    if (req.user.role !== 'solicitor') {
      return res.status(403).json({ message: 'Only solicitors can accept cases' });
    }
    next();
  },
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Find the case
      const caseItem = await Case.findByPk(id);
      if (!caseItem) {
        return res.status(404).json({ message: 'Case not found' });
      }

      // Check if case is available (not assigned yet)
      if (caseItem.assignedSolicitorId) {
        return res.status(400).json({ message: 'Case is already assigned' });
      }

      // Check if the case matches solicitor's specialization
      const solicitor = await Solicitor.findByPk(userId);
      if (!solicitor) {
        return res.status(404).json({ message: 'Solicitor profile not found' });
      }

      if (!solicitor.specializations.includes(caseItem.type)) {
        return res.status(400).json({ 
          message: 'Case type does not match solicitor specialization'
        });
      }

      // Update case with solicitor assignment
      await caseItem.update({
        assignedSolicitorId: userId,
        status: 'IN_PROGRESS'
      });

      // Add timeline entry
      await Timeline.create({
        caseId: id,
        action: 'Case accepted',
        actorId: userId,
        notes: 'Solicitor accepted case'
      });

      // Fetch updated case with associations
      const updatedCase = await Case.findByPk(id, {
        include: [
          { model: Timeline },
          { model: Note },
          { 
            model: User, 
            as: 'assignedSolicitor',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] 
          }
        ]
      });

      res.json(updatedCase);
    } catch (error) {
      console.error('Error accepting case:', error);
      res.status(500).json({ message: 'Error accepting case' });
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

      // Create new note
      await Note.create({
        caseId: req.caseItem.id,
        content,
        createdById: req.user.id,
        isPrivate: isInternal
      });

      // Add timeline entry
      await Timeline.create({
        caseId: req.caseItem.id,
        action: 'Note added',
        actorId: req.user.id,
        notes: isInternal ? 'Internal note added' : 'Note added'
      });

      // Fetch updated case with new note
      const updatedCase = await Case.findByPk(req.caseItem.id, {
        include: [
          { model: Timeline },
          { 
            model: Note,
            include: [
              { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName', 'role'] }
            ]
          }
        ]
      });

      res.json(updatedCase);
    } catch (error) {
      res.status(500).json({ message: 'Error adding note' });
    }
});

module.exports = router;