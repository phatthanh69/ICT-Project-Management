const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const { Case, Client, User } = require('../models');
const { Op, Sequelize } = require('sequelize');

// Get client dashboard stats
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'client') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const userId = req.user.id;

    const [
      totalCases,
      activeCases,
      resolvedCases,
      urgentCases,
      recentActivity
    ] = await Promise.all([
      Case.count({ where: { clientId: userId } }),
      Case.count({ 
        where: {
          clientId: userId,
          status: { [Op.notIn]: ['RESOLVED', 'CLOSED'] }
        }
      }),
      Case.count({ where: { clientId: userId, status: 'RESOLVED' } }),
      Case.count({ 
        where: { 
          clientId: userId,
          priority: 'URGENT',
          status: { [Op.notIn]: ['RESOLVED', 'CLOSED'] }
        }
      }),
      Case.findAll({ 
        where: { clientId: userId },
        order: [['timeline', 'createdAt', 'DESC']],
        limit: 5,
        include: [{
          model: User,
          as: 'assignedSolicitor',
          attributes: ['firstName', 'lastName']
        }]
      })
    ]);

    res.json({
      stats: {
        totalCases,
        activeCases,
        resolvedCases,
        urgentCases
      },
      recentActivity
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching dashboard data' });
  }
});

// Get client communication history
router.get('/communications', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'client') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const communications = await Case.findAll({
      where: { client: req.user.userId },
      include: [{
        model: 'Note',
        where: { isInternal: false },
        include: [{
          model: User,
          as: 'author',
          attributes: ['firstName', 'lastName', 'role']
        }]
      }],
      order: [[Sequelize.literal('"Notes"."createdAt"'), 'DESC']]
    });

    // Transform the data to match the expected format
    const formattedCommunications = [];
    communications.forEach(caseItem => {
      caseItem.Notes.forEach(note => {
        formattedCommunications.push({
          caseId: caseItem.id,
          caseType: caseItem.type,
          noteId: note.id,
          content: note.content,
          createdAt: note.createdAt,
          author: {
            name: `${note.author.firstName} ${note.author.lastName}`,
            role: note.author.role
          }
        });
      });
    });

    res.json(formattedCommunications);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching communication history' });
  }
});

// Get client profile details
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'client') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const client = await Client.findByPk(
      req.user.userId,
      {
        attributes: { exclude: ['password'] },
        include: [{
          model: Case,
          as: 'cases',
          attributes: ['type', 'status', 'priority']
        }]
      }
    );

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json(client);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching client profile' });
  }
});

module.exports = router;