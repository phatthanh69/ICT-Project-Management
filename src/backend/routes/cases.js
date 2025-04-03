const express = require('express');
const router = express.Router();
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('./auth');
const { Op } = require('sequelize');
const { Case, User, Solicitor, Client, CaseActivity: Timeline, CaseNote: Note } = require('../models');

// Configure multer for file upload
const upload = multer();

// Middleware to check if user has access to case
const checkCaseAccess = async (req, res, next) => {
  try {
    const caseId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!userId) {
      return res.status(400).json({ message: 'Missing user ID' });
    }

    console.log('Checking case access:', { caseId, userId, role: userRole });

    // Fetch case with essential data for access check
    const caseItem = await Case.findByPk(caseId, {
      attributes: ['id', 'clientId', 'assignedSolicitorId', 'type', 'status'],
      raw: true
    });
    
    if (!caseItem) {
      console.log(`Case not found: ${caseId}`);
      return res.status(404).json({ message: 'Case not found' });
    }

    // Admin has access to all active cases
    if (userRole === 'admin') {
      req.caseItem = await Case.findByPk(caseId);
      return next();
    }

    // Client access check
    if (userRole === 'client') {
      // Verify client exists
      const client = await Client.findOne({
        where: {
          id: userId
        }
      });

      if (!client) {
        console.log(`Invalid client access attempt: ${userId}`);
        return res.status(403).json({ message: 'Access denied' });
      }

      if (caseItem.clientId === userId) {
        req.caseItem = await Case.findByPk(caseId);
        return next();
      }
      
      console.log(`Access denied: Client ${userId} attempted to access case ${caseId}`);
      return res.status(403).json({ message: 'Access denied' });
    }

    // Solicitor access check
    if (userRole === 'solicitor') {
      // Verify solicitor exists
      const solicitor = await Solicitor.findOne({
        where: {
          id: userId
        },
        attributes: ['id', 'specializations', 'verified']
      });

      if (!solicitor) {
        console.error(`Solicitor profile not found: ${userId}`);
        return res.status(403).json({ message: 'Access denied' });
      }

      // Direct access if assigned to case
      if (caseItem.assignedSolicitorId === userId) {
        req.caseItem = await Case.findByPk(caseId);
        return next();
      }
      
      // Check specialization match for unassigned cases
      if (!caseItem.assignedSolicitorId && caseItem.status === 'OPEN') {
        // Validate specializations array
        if (!Array.isArray(solicitor.specializations)) {
          console.error(`Invalid specializations format for solicitor: ${userId}`);
          return res.status(500).json({ message: 'Server configuration error' });
        }
        
        if (solicitor.specializations.includes(caseItem.type)) {
          req.caseItem = await Case.findByPk(caseId);
          return next();
        }
      }
      
      console.log(`Access denied: Solicitor ${userId} attempted to access case ${caseId}`);
      return res.status(403).json({ message: 'Access denied' });
    }

    console.log(`Access denied: User ${userId} with unrecognized role ${userRole}`);
    return res.status(403).json({ message: 'Access denied' });
  } catch (error) {
    console.error('Error checking case access:', error);
    return res.status(500).json({
      message: 'Error checking case access',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
        performedBy: req.user.id,  // Match the model's field name
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
        include: [{ model: Timeline, as: 'activities' }]
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
      {
        model: Client,
        as: 'client',
        include: [{
          model: User,
          attributes: ['id', 'email']
        }]
      },
      {
        model: Solicitor,
        as: 'assignedSolicitor',
        include: [{
          model: User,
          attributes: ['id', 'email']
        }]
      }
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
    // We already have the case with associations from checkCaseAccess middleware
    // Just need to enhance it with additional associations if needed
    const enhancedCase = await Case.findByPk(req.caseItem.id, {
      include: [
        {
          model: Client,
          as: 'client',
          include: [
            {
              model: User,
              attributes: ['id', 'email']
            }
          ]
        },
        {
          model: Solicitor,
          as: 'assignedSolicitor',
          include: [
            {
              model: User,
              attributes: ['id', 'email']
            }
          ]
        },
        {
          model: Timeline,  // This is CaseActivity aliased as Timeline
          as: 'activities', // Match the association name from models/index.js
          include: [
            {
              model: User,
              as: 'performer',
              attributes: ['id', 'role']
            }
          ]
        },
        {
          model: Note,
          as: 'notes',
          include: [
            {
              model: User,
              as: 'author',
              attributes: ['id', 'role']
            }
          ]
        }
      ],
      order: [
        ['createdAt', 'DESC'],
        [{ model: Timeline, as: 'activities' }, 'createdAt', 'DESC'],
        [{ model: Note, as: 'notes' }, 'createdAt', 'DESC']
      ]
    });

    if (!enhancedCase) {
      return res.status(404).json({ message: 'Case not found' });
    }

    res.json(enhancedCase);
  } catch (error) {
    console.error('Error fetching case details:', error);
    res.status(500).json({
      message: 'Error fetching case details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update case
router.patch('/:id',
  authenticateToken,
  checkCaseAccess,
  [
    body('status')
      .optional()
      .isIn(['OPEN', 'IN_PROGRESS', 'CLOSED', 'PENDING_REVIEW', 'AWAITING_CLIENT', 'ON_HOLD'])
      .withMessage('Invalid status value'),
    body('priority')
      .optional()
      .isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
      .withMessage('Invalid priority value'),
    body('description')
      .optional()
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage('Description must be between 10 and 1000 characters')
  ],
  async (req, res) => {
    try {
      // Validate request body
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: 'Invalid input',
          errors: errors.array()
        });
      }

      const allowedUpdates = ['status', 'priority', 'description'];
      const updates = Object.keys(req.body)
        .filter(key => allowedUpdates.includes(key))
        .reduce((obj, key) => {
          obj[key] = req.body[key];
          return obj;
        }, {});

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: 'No valid updates provided' });
      }

      // Use transaction to ensure data consistency
      // Import sequelize from models to use transactions
      const { sequelize } = require('../models');
      const result = await sequelize.transaction(async (t) => {
        // Add timeline entry
        await Timeline.create({
          caseId: req.caseItem.id,
          action: 'Case updated',
          performedBy: req.user.id,  // Match the model's field name
          notes: `Updated: ${Object.keys(updates).join(', ')}`,
          details: JSON.stringify({
            previous: {
              status: req.caseItem.status,
              priority: req.caseItem.priority,
              description: req.caseItem.description
            },
            updated: updates
          })
        }, { transaction: t });

        // Update case
        await req.caseItem.update(updates, { transaction: t });
        
        // Fetch updated case with associations
        return await Case.findByPk(req.caseItem.id, {
          include: [
            {
              model: Timeline,
              as: 'activities',
              order: [['createdAt', 'DESC']]
            },
            {
              model: Note,
              as: 'notes',
              order: [['createdAt', 'DESC']]
            },
            {
              model: Client,
              as: 'client',
              include: [{
                model: User,
                attributes: ['id', 'firstName', 'lastName', 'email']
              }]
            },
            {
              model: Solicitor,
              as: 'assignedSolicitor',
              include: [{
                model: User,
                attributes: ['id', 'firstName', 'lastName', 'email']
              }]
            }
          ],
          transaction: t
        });
      });

      res.json(result);
    } catch (error) {
      console.error('Error updating case:', error);
      res.status(500).json({
        message: 'Error updating case',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
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
      if (!solicitor || !(await solicitor.canTakeNewCase())) {
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
        performedBy: req.user.id,
        details: { solicitorId }
      });

      // Fetch updated case with associations
      const updatedCase = await Case.findByPk(req.caseItem.id, {
        include: [
          { model: Timeline, as: 'activities' },
          { model: Note, as: 'notes' },
          {
            model: Solicitor,
            as: 'assignedSolicitor',
            include: [{
              model: User,
              attributes: ['id', 'email']
            }]
          }
        ]
      });

      res.json(updatedCase);
    } catch (error) {
      console.error('Error assigning solicitor:', error);
      res.status(500).json({ 
        message: 'Error assigning solicitor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
});

// Accept a case (for solicitors)
router.post('/:id/accept',
  authenticateToken,
  checkCaseAccess, // Added case access check
  async (req, res, next) => {
    if (req.user.role !== 'solicitor') {
      return res.status(403).json({ message: 'Only solicitors can accept cases' });
    }
    next();
  },
  async (req, res) => {
    try {
      const caseId = req.params.id;
      const userId = req.user.id;

      if (!userId) {
        return res.status(400).json({ message: 'Missing user ID' });
      }

      // Check if solicitor exists and can take cases
      const solicitor = await Solicitor.findOne({
        where: {
          id: userId
        },
        attributes: ['id', 'specializations', 'verified']
      });

      if (!solicitor) {
        return res.status(404).json({ message: 'Solicitor profile not found' });
      }
      
      // Verify solicitor is verified
      if (!solicitor.verified) {
        return res.status(403).json({ message: 'Solicitor is not verified to take cases' });
      }

      if (req.caseItem.status !== 'OPEN') {
        return res.status(400).json({ message: 'Case is not available for acceptance' });
      }

      if (req.caseItem.assignedSolicitorId) {
        return res.status(400).json({ message: 'Case is already assigned' });
      }

      if (!Array.isArray(solicitor.specializations) || !solicitor.specializations.includes(req.caseItem.type)) {
        return res.status(400).json({
          message: 'Case type does not match solicitor specialization'
        });
      }
      
      // Check if the solicitor can take more cases
      if (!(await solicitor.canTakeNewCase())) {
        return res.status(403).json({ message: 'You have reached your maximum caseload' });
      }

      // Use transaction to ensure data consistency
      const { sequelize } = require('../models');
      const result = await sequelize.transaction(async (t) => {
        // Update case with solicitor assignment
        await req.caseItem.update({
          assignedSolicitorId: userId,
          status: 'IN_PROGRESS'
        }, { transaction: t });

        // Add timeline entry
        await Timeline.create({
          caseId: caseId,
          action: 'Case accepted',
          performedBy: userId,
          details: { solicitorId: userId }
        }, { transaction: t });

        // Fetch updated case with associations
        return await Case.findByPk(caseId, {
          include: [
            {
              model: Timeline,
              as: 'activities',
              order: [['createdAt', 'DESC']]
            },
            {
              model: Note,
              as: 'notes',
              order: [['createdAt', 'DESC']]
            },
            {
              model: Solicitor,
              as: 'assignedSolicitor',
              include: [{
                model: User,
                attributes: ['id', 'email']
              }]
            }
          ],
          transaction: t
        });
      });

      res.json(result);
    } catch (error) {
      console.error('Error accepting case:', error);
      res.status(500).json({
        message: 'Error accepting case',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
});

// Add note to case
router.post('/:id/notes',
  authenticateToken,
  checkCaseAccess,
  [
    body('content')
      .trim()
      .isLength({ min: 1, max: 2000 })
      .withMessage('Note content must be between 1 and 2000 characters'),
    body('isInternal')
      .optional()
      .isBoolean()
      .withMessage('isInternal must be a boolean value')
  ],
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: 'Invalid input',
          errors: errors.array()
        });
      }

      const { content, isInternal = false } = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;

      // Only allow internal notes for solicitors and admins
      if (isInternal && !['solicitor', 'admin'].includes(userRole)) {
        return res.status(403).json({
          message: 'Only solicitors and admins can create internal notes'
        });
      }

      // Use transaction to ensure data consistency
      const { sequelize } = require('../models');
      const result = await sequelize.transaction(async (t) => {
        // Create new note
        const newNote = await Note.create({
          caseId: req.caseItem.id,
          content: content.trim(),
          createdBy: userId,
          isPrivate: isInternal
        }, { transaction: t });

        // Add timeline entry
        await Timeline.create({
          caseId: req.caseItem.id,
          action: 'Note added',
          performedBy: userId,
          details: {
            noteId: newNote.id,
            isInternal,
            contentPreview: content.substring(0, 50) + (content.length > 50 ? '...' : '')
          }
        }, { transaction: t });

        // Fetch updated case with filtered notes based on user role
        return await Case.findByPk(req.caseItem.id, {
          include: [
            {
              model: Timeline,
              as: 'activities',
              separate: true,
              order: [['createdAt', 'DESC']],
              include: [{
                model: User,
                as: 'performer',
                attributes: ['id', 'role']
              }]
            },
            {
              model: Note,
              as: 'notes',
              separate: true,
              where: userRole === 'client' ? { isPrivate: false } : {},
              required: false,
              order: [['createdAt', 'DESC']],
              include: [{
                model: User,
                as: 'author',
                attributes: ['id', 'role']
              }]
            }
          ],
          transaction: t
        });
      });

      res.json(result);
    } catch (error) {
      console.error('Error adding note:', error);
      res.status(500).json({
        message: 'Error adding note',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
});

module.exports = router;