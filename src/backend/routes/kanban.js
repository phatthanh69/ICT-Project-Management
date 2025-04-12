const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const { Case, User, Solicitor, Client } = require('../models');
const { Op } = require('sequelize');

// Get cases for Kanban board
router.get('/board', authenticateToken, async (req, res) => {
  try {
    const { userId, role } = req.user;
    let whereClause = {};

    // Filter cases based on user role
    if (role === 'solicitor') {
      whereClause.assignedSolicitorId = userId;
    } else if (role === 'client') {
      whereClause.clientId = userId;
    }
    // Admin can see all cases

    // Get cases with appropriate associations
    const cases = await Case.findAll({
      where: whereClause,
      include: [
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
      order: [['updatedAt', 'DESC']]
    });

    // Convert cases to Kanban format
    const lanes = {
      OPEN: {
        id: 'OPEN',
        title: 'Open',
        cases: []
      },
      IN_PROGRESS: {
        id: 'IN_PROGRESS',
        title: 'In Progress',
        cases: []
      },
      PENDING_REVIEW: {
        id: 'PENDING_REVIEW',
        title: 'Pending Review',
        cases: []
      },
      AWAITING_CLIENT: {
        id: 'AWAITING_CLIENT',
        title: 'Awaiting Client',
        cases: []
      },
      ON_HOLD: {
        id: 'ON_HOLD',
        title: 'On Hold',
        cases: []
      },
      CLOSED: {
        id: 'CLOSED',
        title: 'Closed',
        cases: []
      }
    };

    // Distribute cases into lanes based on status
    cases.forEach(caseItem => {
      const plainCase = {
        id: caseItem.id,
        caseNumber: caseItem.caseNumber,
        type: caseItem.type,
        description: caseItem.description,
        priority: caseItem.priority,
        client: caseItem.client ? {
          id: caseItem.client.id,
          name: caseItem.client.User ? `${caseItem.client.User.firstName} ${caseItem.client.User.lastName}` : 'Unknown'
        } : null,
        solicitor: caseItem.assignedSolicitor ? {
          id: caseItem.assignedSolicitor.id,
          name: caseItem.assignedSolicitor.User ? `${caseItem.assignedSolicitor.User.firstName} ${caseItem.assignedSolicitor.User.lastName}` : 'Unknown'
        } : null,
        createdAt: caseItem.createdAt,
        updatedAt: caseItem.updatedAt
      };

      if (lanes[caseItem.status]) {
        lanes[caseItem.status].cases.push(plainCase);
      } else {
        // If status doesn't match existing lanes, add to Open as fallback
        lanes.OPEN.cases.push(plainCase);
      }
    });

    // Convert lanes object to array for frontend
    const response = Object.values(lanes);

    res.json(response);
  } catch (error) {
    console.error('Error fetching Kanban board data:', error);
    res.status(500).json({ 
      message: 'Error fetching Kanban board data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update case status (move card between lanes)
router.patch('/move/:caseId', authenticateToken, async (req, res) => {
  try {
    const { caseId } = req.params;
    const { newStatus } = req.body;
    const { userId, role } = req.user;

    // Validate newStatus
    const validStatuses = ['OPEN', 'IN_PROGRESS', 'PENDING_REVIEW', 'AWAITING_CLIENT', 'ON_HOLD', 'CLOSED'];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Find the case
    const caseItem = await Case.findByPk(caseId);
    if (!caseItem) {
      return res.status(404).json({ message: 'Case not found' });
    }

    // Access check based on role
    if (role === 'solicitor' && caseItem.assignedSolicitorId !== userId) {
      return res.status(403).json({ message: 'You do not have permission to update this case' });
    } else if (role === 'client' && caseItem.clientId !== userId) {
      return res.status(403).json({ message: 'You do not have permission to update this case' });
    }

    // Update the case status
    const oldStatus = caseItem.status;
    caseItem.status = newStatus;
    await caseItem.save();

    // Add activity record for the status change
    await caseItem.addActivity('Status updated', userId, {
      oldStatus,
      newStatus
    });

    res.json({
      success: true,
      case: {
        id: caseItem.id,
        status: caseItem.status
      }
    });
  } catch (error) {
    console.error('Error moving case:', error);
    res.status(500).json({ 
      message: 'Error moving case',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
