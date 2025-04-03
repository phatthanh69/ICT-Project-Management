const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const { Case, User, Solicitor, Client, CaseActivity } = require('../models');
const { Op, Sequelize } = require('sequelize');

// Admin middleware - copied from admin.js for consistency
const isAdmin = (req, res, next) => {
  // Check if user exists and has correct role
  if (!req.user || !req.user.role || req.user.role !== 'admin') {
    console.log('Admin access denied:', {
      hasUser: !!req.user,
      role: req.user ? req.user.role : null
    });
    return res.status(403).json({ message: 'Admin access required' });
  }
  
  // Check if user has admin permissions
  if (!req.user.permissions || !req.user.permissions.length) {
    console.log('Admin access denied: No permissions');
    return res.status(403).json({ message: 'No admin permissions' });
  }
  
  next();
};

// Get system statistics
router.get('/stats', authenticateToken, isAdmin, async (req, res) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Use more robust error handling with Promise.allSettled
    const results = await Promise.allSettled([
      Case.count(),
      Case.count({ where: { status: 'OPEN' } }), // Changed to 'OPEN' as per Case model
      Case.count({ where: { status: 'IN_PROGRESS' } }),
      Case.count({ where: { status: 'CLOSED' } }),
      Client.count(),
      Solicitor.count(),
      Case.count({ 
        where: { 
          priority: 'URGENT',
          status: { [Op.ne]: 'CLOSED' }
        }
      }),
      Case.count({
        where: {
          status: 'OPEN', // Changed to 'OPEN' as per Case model
          createdAt: { [Op.lt]: oneDayAgo }
        }
      }),
      // Get case type distribution with better error handling
      Case.findAll({
        attributes: [
          'type',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
        ],
        group: ['type'],
        raw: true
      }).catch(err => {
        console.error('Error fetching case types:', err);
        return [];
      })
    ]);

    // Extract values from Promise.allSettled results
    const [
      totalCasesResult,
      newCasesResult,
      assignedCasesResult,
      resolvedCasesResult,
      totalClientsResult,
      totalSolicitorsResult,
      urgentCasesResult,
      deadlineApproachingResult,
      caseTypesResult
    ] = results;

    // Safely extract values or default to 0
    const totalCases = totalCasesResult.status === 'fulfilled' ? totalCasesResult.value : 0;
    const newCases = newCasesResult.status === 'fulfilled' ? newCasesResult.value : 0;
    const assignedCases = assignedCasesResult.status === 'fulfilled' ? assignedCasesResult.value : 0;
    const resolvedCases = resolvedCasesResult.status === 'fulfilled' ? resolvedCasesResult.value : 0;
    const totalClients = totalClientsResult.status === 'fulfilled' ? totalClientsResult.value : 0;
    const totalSolicitors = totalSolicitorsResult.status === 'fulfilled' ? totalSolicitorsResult.value : 0;
    const urgentCases = urgentCasesResult.status === 'fulfilled' ? urgentCasesResult.value : 0;
    const deadlineApproaching = deadlineApproachingResult.status === 'fulfilled' ? deadlineApproachingResult.value : 0;
    const caseTypes = caseTypesResult.status === 'fulfilled' ? caseTypesResult.value : [];

    res.json({
      overview: {
        totalCases,
        newCases,
        assignedCases,
        resolvedCases,
        totalClients,
        totalSolicitors,
        urgentCases,
        deadlineApproaching
      },
      caseTypes: caseTypes.reduce((acc, { type, count }) => {
        acc[type] = parseInt(count);
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ 
      message: 'Error fetching statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// Get cases requiring attention
router.get('/urgent-cases', authenticateToken, isAdmin, async (req, res) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const urgentCases = await Case.findAll({
      where: {
        [Op.or]: [
          { 
            priority: 'URGENT',
            status: { [Op.ne]: 'CLOSED' } // Keep this condition as CLOSED likely exists
          },
          {
            status: 'OPEN', // Changed to 'OPEN' as per Case model
            createdAt: { [Op.lt]: oneDayAgo }
          }
        ]
      },
      include: [
        {
          model: Client,
          as: 'client',
          include: [{
            model: User,
            as: 'ClientUser', // Changed from 'User' to 'ClientUser'
            attributes: ['firstName', 'lastName', 'email']
          }]
        },
        {
          model: Solicitor,
          as: 'assignedSolicitor',
          include: [{
            model: User,
            as: 'SolicitorUser', // Changed from 'User' to 'SolicitorUser'
            attributes: ['firstName', 'lastName', 'email', 'phone']
          }]
        }
      ],
      order: [['expectedResponseBy', 'ASC']]
    });

    res.json(urgentCases);
  } catch (error) {
    console.error('Error fetching urgent cases:', error);
    res.status(500).json({ 
      message: 'Error fetching urgent cases',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// Get activity log using CaseActivity model
router.get('/activity-log', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { startDate, endDate, type, page = 1, limit = 20 } = req.query;
    const whereClause = {};
    
    if (startDate && endDate) {
      whereClause.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    if (type) {
      whereClause.action = type;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitInt = parseInt(limit);
    
    // Handle invalid pagination parameters
    if (isNaN(offset) || isNaN(limitInt)) {
      return res.status(400).json({ message: 'Invalid pagination parameters' });
    }
    
    const { count, rows: activities } = await CaseActivity.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Case,
          attributes: ['id', 'caseNumber']
        },
        {
          model: User,
          as: 'performer',
          attributes: ['firstName', 'lastName', 'role']
        }
      ],
      order: [['createdAt', 'DESC']],
      offset,
      limit: limitInt
    });

    const formattedActivities = activities.map(activity => ({
      id: activity.id,
      caseNumber: activity.Case ? activity.Case.caseNumber : null,
      action: activity.action,
      timestamp: activity.createdAt,
      details: activity.details,
      performer: activity.performer ? {
        name: `${activity.performer.firstName} ${activity.performer.lastName}`,
        role: activity.performer.role
      } : null
    }));

    res.json({
      activities: formattedActivities,
      totalActivities: count,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limitInt)
    });
  } catch (error) {
    console.error('Error fetching activity log:', error);
    res.status(500).json({ 
      message: 'Error fetching activity log',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// Get case trends
router.get('/trends', authenticateToken, isAdmin, async (req, res) => {
  try {
    const now = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(now.getMonth() - 1);
    
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(now.getMonth() - 2);

    // Use more robust error handling with try/catch for each query
    let currentStats, previousStats;

    try {
      currentStats = await Case.findAll({
        where: {
          createdAt: { [Op.gte]: lastMonth }
        },
        attributes: [
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalCases'],
          [
            Sequelize.fn('SUM', 
              Sequelize.literal("CASE WHEN status != 'CLOSED' THEN 1 ELSE 0 END")
            ),
            'openCases'
          ],
          [
            Sequelize.fn('AVG', 
              Sequelize.literal("CASE WHEN status = 'CLOSED' THEN EXTRACT(EPOCH FROM \"updatedAt\" - \"createdAt\") ELSE NULL END")
            ),
            'avgResponseTime'
          ]
        ],
        raw: true
      });
    } catch (error) {
      console.error('Error fetching current stats:', error);
      currentStats = [{ totalCases: 0, openCases: 0, avgResponseTime: 0 }];
    }

    try {
      previousStats = await Case.findAll({
        where: {
          createdAt: {
            [Op.gte]: twoMonthsAgo,
            [Op.lt]: lastMonth
          }
        },
        attributes: [
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalCases'],
          [
            Sequelize.fn('SUM', 
              Sequelize.literal("CASE WHEN status != 'CLOSED' THEN 1 ELSE 0 END")
            ),
            'openCases'
          ],
          [
            Sequelize.fn('AVG', 
              Sequelize.literal("CASE WHEN status = 'CLOSED' THEN EXTRACT(EPOCH FROM \"updatedAt\" - \"createdAt\") ELSE NULL END")
            ),
            'avgResponseTime'
          ]
        ],
        raw: true
      });
    } catch (error) {
      console.error('Error fetching previous stats:', error);
      previousStats = [{ totalCases: 0, openCases: 0, avgResponseTime: 0 }];
    }

    // Add solicitor trend query
    let solicitorTrend = 0;
    try {
      const currentSolicitorCount = await Solicitor.count({
        where: { createdAt: { [Op.gte]: lastMonth } }
      });
      
      const previousSolicitorCount = await Solicitor.count({
        where: {
          createdAt: {
            [Op.gte]: twoMonthsAgo,
            [Op.lt]: lastMonth
          }
        }
      });
      
      solicitorTrend = previousSolicitorCount > 0 
        ? ((currentSolicitorCount - previousSolicitorCount) / previousSolicitorCount) * 100
        : 0;
    } catch (error) {
      console.error('Error calculating solicitor trend:', error);
    }

    // Add client trend query
    let clientTrend = 0;
    try {
      const currentClientCount = await Client.count({
        where: { createdAt: { [Op.gte]: lastMonth } }
      });
      
      const previousClientCount = await Client.count({
        where: {
          createdAt: {
            [Op.gte]: twoMonthsAgo,
            [Op.lt]: lastMonth
          }
        }
      });
      
      clientTrend = previousClientCount > 0 
        ? ((currentClientCount - previousClientCount) / previousClientCount) * 100
        : 0;
    } catch (error) {
      console.error('Error calculating client trend:', error);
    }

    const calculateTrend = (current, previous) => {
      const curr = parseFloat(current || 0);
      const prev = parseFloat(previous || 0);
      if (!prev) return 0;
      return ((curr - prev) / prev) * 100;
    };

    const trends = {
      totalCases: calculateTrend(
        currentStats[0]?.totalCases,
        previousStats[0]?.totalCases
      ),
      openCases: calculateTrend(
        currentStats[0]?.openCases,
        previousStats[0]?.openCases
      ),
      avgResponseTime: calculateTrend(
        currentStats[0]?.avgResponseTime,
        previousStats[0]?.avgResponseTime
      ),
      solicitorTrend,
      clientTrend
    };

    res.json(trends);
  } catch (error) {
    console.error('Error calculating trends:', error);
    res.status(500).json({ 
      message: 'Error calculating trends',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

module.exports = router;
