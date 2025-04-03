const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const { Case, Solicitor, Client } = require('../models');
const { Op } = require('sequelize');

// Get solicitor dashboard stats
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'solicitor') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const userId = req.user.id;
    const now = new Date();

    const [
      activeCases,
      completedCases,
      urgentCases,
      pendingCases,
      recentActivity,
      performance
    ] = await Promise.all([
      Case.count({ 
        where: { 
          assignedSolicitorId: userId,
          status: { [Op.ne]: 'CLOSED' }
        }
      }),
      Case.count({
        where: {
          assignedSolicitorId: userId,
          status: 'CLOSED'
        }
      }),
      Case.count({
        where: {
          assignedSolicitorId: userId,
          priority: 'URGENT',
          status: { [Op.ne]: 'CLOSED' }
        }
      }),
      Case.findAll({
        where: {
          assignedSolicitorId: userId,
          status: { [Op.ne]: 'CLOSED' }
        },
        attributes: ['type', 'priority', 'status', 'expectedResponseBy'],
        order: [['expectedResponseBy', 'ASC']],
        limit: 5
      }),
      Case.findAll({ 
        where: { assignedSolicitorId: userId },
        order: [['timeline', 'createdAt', 'DESC']],
        limit: 5,
        include: [{
          model: Client,
          as: 'client',
          attributes: ['firstName', 'lastName']
        }]
      }),
      Case.findAll({
        where: {
          assignedSolicitorId: userId,
          status: 'CLOSED'
        },
        attributes: [
          [
            Case.sequelize.fn('AVG', 
              Case.sequelize.fn('EXTRACT', Case.sequelize.literal('EPOCH FROM "lastUpdated" - "createdAt"'))),
            'avgResponseTime'
          ],
          [Case.sequelize.fn('COUNT', Case.sequelize.col('id')), 'totalCases']
        ],
        raw: true
      })
    ]);

    const performanceData = performance[0] || { avgResponseTime: 0, totalCases: 0 };
    
    res.json({
      caseload: {
        activeCases,
        completedCases,
        urgentCases
      },
      pendingCases,
      recentActivity,
      performance: {
        averageResponseTime: Math.round(performanceData.avgResponseTime / (60 * 60) || 0), // Convert to hours
        totalCasesHandled: parseInt(performanceData.totalCases || 0)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching dashboard data' });
  }
});

// Update solicitor availability
router.patch('/availability', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'solicitor') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { maxCases, availableHours, vacation } = req.body;
    const solicitor = await Solicitor.findByPk(req.user.id);

    if (!solicitor) {
      return res.status(404).json({ message: 'Solicitor not found' });
    }

    // Get current availability or create default
    let availability = solicitor.availability || {};

    if (maxCases !== undefined) {
      availability.maxCases = maxCases;
    }

    if (availableHours) {
      availability.availableHours = availableHours;
    }

    if (vacation) {
      availability.vacation = vacation;
    }

    solicitor.availability = availability;
    await solicitor.save();
    res.json(solicitor.availability);
  } catch (error) {
    res.status(500).json({ message: 'Error updating availability' });
  }
});

// Get suggested cases based on specialization
router.get('/suggested-cases', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'solicitor') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const solicitor = await Solicitor.findByPk(req.user.userId);
    if (!solicitor) {
      return res.status(404).json({ message: 'Solicitor not found' });
    }

    const suggestedCases = await Case.findAll({
      where: {
        type: { [Op.in]: solicitor.specializations },
        status: 'NEW',
        assignedSolicitorId: null
      },
      include: [{
        model: Client,
        as: 'client',
        attributes: ['firstName', 'lastName']
      }],
      order: [
        ['priority', 'DESC'],
        ['createdAt', 'ASC']
      ],
      limit: 10
    });

    res.json(suggestedCases);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching suggested cases' });
  }
});

// Get performance metrics
router.get('/performance', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'solicitor') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { startDate, endDate } = req.query;
    const whereClause = { assignedSolicitorId: req.user.id };

    if (startDate && endDate) {
      whereClause.createdAt = {
        [Op.gte]: new Date(startDate),
        [Op.lte]: new Date(endDate)
      };
    }

    // Get performance by status
    const performance = await Case.findAll({
      where: whereClause,
      attributes: [
        'status',
        [Case.sequelize.fn('COUNT', Case.sequelize.col('id')), 'count'],
        [
          Case.sequelize.fn('AVG', 
            Case.sequelize.fn('CASE', 
              Case.sequelize.literal('WHEN status = \'CLOSED\' THEN EXTRACT(EPOCH FROM "lastUpdated" - "createdAt") ELSE NULL END')
            )
          ),
          'avgResponseTime'
        ]
      ],
      group: ['status'],
      raw: true
    });

    // Get cases by type
    const casesByType = await Case.findAll({
      where: whereClause,
      attributes: [
        'type',
        [Case.sequelize.fn('COUNT', Case.sequelize.col('id')), 'count'],
        [
          Case.sequelize.fn('SUM', 
            Case.sequelize.fn('CASE', 
              Case.sequelize.literal('WHEN status = \'CLOSED\' THEN 1 ELSE 0 END')
            )
          ),
          'resolvedCount'
        ]
      ],
      group: ['type'],
      raw: true
    });

    res.json({
      overall: performance.reduce((acc, p) => {
        acc[p.status] = {
          count: parseInt(p.count),
          avgResponseTime: p.avgResponseTime ? 
            Math.round(p.avgResponseTime / (60 * 60)) : null // Convert to hours
        };
        return acc;
      }, {}),
      byType: casesByType.reduce((acc, c) => {
        const count = parseInt(c.count);
        const resolvedCount = parseInt(c.resolvedCount);
        acc[c.type] = {
          total: count,
          resolved: resolvedCount,
          resolutionRate: Math.round((resolvedCount / count) * 100)
        };
        return acc;
      }, {})
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching performance metrics' });
  }
});

// Update specializations
router.patch('/specializations', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'solicitor') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { specializations } = req.body;
    const validTypes = [
      'family', 'immigration', 'housing', 'employment',
      'civil', 'criminal', 'other'
    ];

    if (!Array.isArray(specializations) || 
        !specializations.every(type => validTypes.includes(type))) {
      return res.status(400).json({ message: 'Invalid specializations' });
    }

    const solicitor = await Solicitor.update(
      { specializations },
      { 
        where: { id: req.user.id },
        returning: true
      }
    );

    res.json(solicitor[1][0]); // Return the updated solicitor
  } catch (error) {
    res.status(500).json({ message: 'Error updating specializations' });
  }
});

module.exports = router;