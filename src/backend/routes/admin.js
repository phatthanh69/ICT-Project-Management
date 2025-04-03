const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const { Case, User, Solicitor, Client } = require('../models');
const { Op, Sequelize } = require('sequelize');

// Admin middleware
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

    const [
      totalCases,
      newCases,
      assignedCases,
      resolvedCases,
      totalClients,
      totalSolicitors,
      urgentCases,
      deadlineApproaching
    ] = await Promise.all([
      Case.count(),
      Case.count({ where: { status: 'new' } }),
      Case.count({ where: { status: 'in_progress' } }),
      Case.count({ where: { status: 'closed' } }),
      Client.count(),
      Solicitor.count(),
      Case.count({ 
        where: { 
          priority: 'urgent',
          status: { [Op.ne]: 'closed' }
        }
      }),
      Case.count({
        where: {
          status: 'new',
          createdAt: { [Op.lt]: oneDayAgo }
        }
      })
    ]);

    // Get case type distribution
    const caseTypes = await Case.findAll({
      attributes: [
        'type',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      group: ['type'],
      raw: true
    });

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
    res.status(500).json({ message: 'Error fetching statistics' });
  }
});

// Get all cases with admin privileges
router.get('/cases', authenticateToken, isAdmin, async (req, res) => {
  try {
    const {
      type,
      status,
      priority,
      search,
      page = 1,
      limit = 10
    } = req.query;

    // Build query
    const whereClause = {};
    
    if (type && type !== 'undefined' && type !== 'null') whereClause.type = type;
    if (status && status !== 'undefined' && status !== 'null') whereClause.status = status;
    if (priority && priority !== 'undefined' && priority !== 'null') whereClause.priority = priority;
    
    if (search && search !== 'undefined' && search !== 'null') {
      whereClause[Op.or] = [
        { caseNumber: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Ensure pagination parameters are numbers
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const offset = (pageNum - 1) * limitNum;
    
    // Log query for debugging
    console.log('Admin case query:', JSON.stringify(whereClause), 'page:', pageNum, 'limit:', limitNum);
    
    const { count: totalCases, rows: cases } = await Case.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'assignedSolicitor',
          attributes: ['firstName', 'lastName', 'email', 'specializations']
        },
        {
          model: User,
          as: 'client',
          attributes: ['firstName', 'lastName', 'email']
        }
      ],
      order: [['createdAt', 'DESC']],
      offset,
      limit: limitNum
    });

    const totalPages = Math.ceil(totalCases / limitNum);

    res.json({
      cases,
      currentPage: pageNum,
      totalPages,
      totalCases,
      itemsPerPage: limitNum
    });
  } catch (error) {
    console.error('Error fetching admin cases:', error);
    // Send more detailed error information
    res.status(500).json({ 
      message: 'Error fetching cases',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get all users with filtering
router.get('/users', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { role, search, status } = req.query;
    const whereClause = {};

    if (role) {
      whereClause.role = role;
    }

    if (search) {
      whereClause[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const users = await User.findAll({
      where: whereClause,
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
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
            priority: 'urgent',
            status: { [Op.ne]: 'closed' }
          },
          {
            status: 'new',
            createdAt: { [Op.lt]: oneDayAgo }
          }
        ]
      },
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'assignedSolicitor',
          attributes: ['firstName', 'lastName', 'email']
        }
      ],
      order: [['expectedResponseBy', 'ASC']]
    });

    res.json(urgentCases);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching urgent cases' });
  }
});

// Get reports
router.get('/reports', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { timeRange } = req.query;
    const now = new Date();
    let startDate;

    // Calculate start date based on time range
    switch (timeRange) {
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'quarter':
        startDate = new Date(now.setMonth(now.getMonth() - 3));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        startDate = new Date(now.setMonth(now.getMonth() - 1)); // Default to last month
    }

    // Get basic stats
    const [totalCases, openCases, closedCases] = await Promise.all([
      Case.count({ where: { createdAt: { [Op.gte]: startDate } } }),
      Case.count({
        where: {
          createdAt: { [Op.gte]: startDate },
          status: { [Op.ne]: 'closed' }
        }
      }),
      Case.count({
        where: {
          createdAt: { [Op.gte]: startDate },
          status: 'closed'
        }
      })
    ]);

    // Get cases by status
    const casesByStatus = await Case.findAll({
      where: { createdAt: { [Op.gte]: startDate } },
      attributes: [
        'status',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    // Get cases by area of law (type)
    const casesByAreaOfLaw = await Case.findAll({
      where: { createdAt: { [Op.gte]: startDate } },
      attributes: [
        'type',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      group: ['type'],
      raw: true
    });

    // Get cases by month
    const casesByMonth = await Case.findAll({
      where: { createdAt: { [Op.gte]: startDate } },
      attributes: [
        [Sequelize.fn('DATE_TRUNC', 'month', Sequelize.col('createdAt')), 'month'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      group: [Sequelize.fn('DATE_TRUNC', 'month', Sequelize.col('createdAt'))],
      order: [[Sequelize.fn('DATE_TRUNC', 'month', Sequelize.col('createdAt')), 'ASC']],
      raw: true
    });

    // Get average resolution time
    const resolutionTime = await Case.findAll({
      where: {
        createdAt: { [Op.gte]: startDate },
        status: 'closed'
      },
      attributes: [
        [
          Sequelize.fn('AVG', 
            Sequelize.fn('EXTRACT', Sequelize.literal('EPOCH FROM "updatedAt" - "createdAt"'))
          ),
          'avgTime'
        ]
      ],
      raw: true
    });

    // Get solicitor performance
    const solicitorPerformance = await Case.findAll({
      where: { createdAt: { [Op.gte]: startDate } },
      attributes: [
        'assignedSolicitor',
        [
          Sequelize.fn('SUM', 
            Sequelize.literal('CASE WHEN status != \'closed\' THEN 1 ELSE 0 END')
          ),
          'activeCases'
        ],
        [
          Sequelize.fn('SUM', 
            Sequelize.literal('CASE WHEN status = \'closed\' THEN 1 ELSE 0 END')
          ),
          'closedCases'
        ],
        [
          Sequelize.fn('SUM', 
            Sequelize.literal('CASE WHEN status = \'closed\' THEN EXTRACT(EPOCH FROM "updatedAt" - "createdAt") ELSE 0 END')
          ),
          'totalResolutionTime'
        ]
      ],
      group: ['assignedSolicitor'],
      include: [{
        model: User,
        as: 'assignedSolicitor',
        attributes: ['firstName', 'lastName']
      }],
      raw: true
    });

    // Format response
    res.json({
      totalCases,
      openCases,
      closedCases,
      averageResolutionTime: resolutionTime[0] ? 
        Math.round(resolutionTime[0].avgTime / (60 * 60 * 24)) : 0, // Convert to days
      casesByStatus: casesByStatus.reduce((acc, { status, count }) => {
        acc[status] = parseInt(count);
        return acc;
      }, {}),
      casesByAreaOfLaw: casesByAreaOfLaw.reduce((acc, { type, count }) => {
        acc[type] = parseInt(count);
        return acc;
      }, {}),
      casesByMonth: casesByMonth.reduce((acc, { month, count }) => {
        const monthDate = new Date(month);
        const monthName = monthDate.toLocaleString('default', { month: 'short' });
        acc[`${monthName} ${monthDate.getFullYear()}`] = parseInt(count);
        return acc;
      }, {}),
      solicitorPerformance: solicitorPerformance.map(s => ({
        id: s['assignedSolicitor.id'],
        name: `${s['assignedSolicitor.firstName']} ${s['assignedSolicitor.lastName']}`,
        activeCases: parseInt(s.activeCases || 0),
        closedCases: parseInt(s.closedCases || 0),
        avgResolutionTime: parseInt(s.closedCases) ? 
          Math.round(parseInt(s.totalResolutionTime) / parseInt(s.closedCases) / (60 * 60 * 24)) : 0 // Convert to days
      }))
    });
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ message: 'Error generating report' });
  }
});

// Update user status (e.g., verify solicitor)
router.patch('/users/:userId', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { verified, active } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (typeof verified === 'boolean' && user.role === 'solicitor') {
      await Solicitor.update({ verified }, { where: { id: userId } });
    }

    if (typeof active === 'boolean') {
      await User.update({ active }, { where: { id: userId } });
    }

    res.json({ message: 'User status updated' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user status' });
  }
});

// Get activity log
router.get('/activity-log', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { startDate, endDate, type, page = 1, limit = 20 } = req.query;
    const whereClause = {};
    
    if (startDate && endDate) {
      whereClause.timestamp = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    if (type) {
      whereClause.action = type;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const { count, rows: activities } = await ActivityLog.findAndCountAll({
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
      order: [['timestamp', 'DESC']],
      offset,
      limit: parseInt(limit)
    });

    const formattedActivities = activities.map(activity => ({
      caseNumber: activity.Case.caseNumber,
      action: activity.action,
      timestamp: activity.timestamp,
      details: activity.details,
      performer: {
        name: `${activity.performer.firstName} ${activity.performer.lastName}`,
        role: activity.performer.role
      }
    }));

    res.json({
      activities: formattedActivities,
      totalActivities: count,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / parseInt(limit))
    });
  } catch (error) {
    console.error('Error fetching activity log:', error);
    res.status(500).json({ message: 'Error fetching activity log' });
  }
});

// Get case trends
router.get('/trends', authenticateToken, isAdmin, async (req, res) => {
  try {
    const now = new Date();
    const lastMonth = new Date(now.setMonth(now.getMonth() - 1));
    const twoMonthsAgo = new Date(now);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 1);

    const [currentStats, previousStats] = await Promise.all([
      Case.findAll({
        where: {
          createdAt: { [Op.gte]: lastMonth }
        },
        attributes: [
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalCases'],
          [
            Sequelize.fn('SUM', 
              Sequelize.literal('CASE WHEN status != \'closed\' THEN 1 ELSE 0 END')
            ),
            'openCases'
          ],
          [
            Sequelize.fn('AVG', 
              Sequelize.literal('CASE WHEN status = \'closed\' THEN EXTRACT(EPOCH FROM "updatedAt" - "createdAt") ELSE NULL END')
            ),
            'avgResponseTime'
          ]
        ],
        raw: true
      }),
      Case.findAll({
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
              Sequelize.literal('CASE WHEN status != \'closed\' THEN 1 ELSE 0 END')
            ),
            'openCases'
          ],
          [
            Sequelize.fn('AVG', 
              Sequelize.literal('CASE WHEN status = \'closed\' THEN EXTRACT(EPOCH FROM "updatedAt" - "createdAt") ELSE NULL END')
            ),
            'avgResponseTime'
          ]
        ],
        raw: true
      })
    ]);

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
      )
    };

    res.json(trends);
  } catch (error) {
    console.error('Error calculating trends:', error);
    res.status(500).json({ message: 'Error calculating trends' });
  }
});

module.exports = router;