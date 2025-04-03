const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const mongoose = require('mongoose');
const Case = require('../models/Case');
const User = require('../models/User');
const Solicitor = require('../models/Solicitor');
const Client = require('../models/Client');

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
    const [
      totalCases,
      newCases,
      assignedCases,
      resolvedCases,
      totalClients,
      totalSolicitors,
      urgentCases
    ] = await Promise.all([
      Case.countDocuments(),
      Case.countDocuments({ status: 'new' }),
      Case.countDocuments({ status: 'in_progress' }),
      Case.countDocuments({ status: 'closed' }),
      Client.countDocuments(),
      Solicitor.countDocuments(),
      Case.countDocuments({ priority: 'urgent', status: { $not: { $in: ['closed'] } } })
    ]);

    // Get urgent new cases older than 24h
    const now = new Date();
    const deadlineApproaching = await Case.countDocuments({
      status: 'new',
      createdAt: {
        $lt: new Date(now.getTime() - 24 * 60 * 60 * 1000)
      }
    });

    // Get case type distribution
    const caseTypes = await Case.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

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
      caseTypes: caseTypes.reduce((acc, { _id, count }) => {
        acc[_id] = count;
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
    let query = {};
    
    // Better handling of filter parameters
    if (type && type !== 'undefined' && type !== 'null') query.type = type;
    if (status && status !== 'undefined' && status !== 'null') query.status = status;
    if (priority && priority !== 'undefined' && priority !== 'null') query.priority = priority;
    
    if (search && search !== 'undefined' && search !== 'null') {
      query.$or = [
        { caseNumber: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Ensure pagination parameters are numbers
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;
    
    // Log query for debugging
    console.log('Admin case query:', JSON.stringify(query), 'page:', pageNum, 'limit:', limitNum);
    
    const totalCases = await Case.countDocuments(query);
    const totalPages = Math.ceil(totalCases / limitNum);

    // Fetch cases with pagination but handle population carefully to avoid schema errors
    let cases;
    try {
      // Try with full population
      cases = await Case.find(query)
        .populate('assignedSolicitor', 'firstName lastName email specializations')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum);

      // If Client model exists, populate client separately
      if (mongoose.models.Client) {
        cases = await Case.populate(cases, {
          path: 'client',
          select: 'firstName lastName email',
          model: 'Client'
        });
      } else {
        console.warn('Client model not registered, skipping client population');
      }
    } catch (populateError) {
      console.error('Population error:', populateError);
      // Fallback to basic query without population if population fails
      cases = await Case.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum);
    }

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
    let query = {};

    if (role) {
      query.role = role;
    }

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Get cases requiring attention
router.get('/urgent-cases', authenticateToken, isAdmin, async (req, res) => {
  try {
    const now = new Date();
    const urgentCases = await Case.find({
      $or: [
        { priority: 'urgent', status: { $not: { $in: ['closed'] } } },
        {
          status: 'new',
          createdAt: {
            $lt: new Date(now.getTime() - 24 * 60 * 60 * 1000)
          }
        }
      ]
    })
    .populate('client', 'firstName lastName email')
    .populate('assignedSolicitor', 'firstName lastName email')
    .sort({ expectedResponseBy: 1 });

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
      Case.countDocuments({ createdAt: { $gte: startDate } }),
      Case.countDocuments({
        createdAt: { $gte: startDate },
        status: { $not: { $in: ['closed'] } }
      }),
      Case.countDocuments({
        createdAt: { $gte: startDate },
        status: 'closed'
      })
    ]);

    // Get cases by status
    const casesByStatus = await Case.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Get cases by area of law (type)
    const casesByAreaOfLaw = await Case.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    // Get cases by month
    const casesByMonth = await Case.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Get average resolution time
    const resolutionTime = await Case.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: 'closed'
        }
      },
      {
        $group: {
          _id: null,
          avgTime: {
           $avg: { $subtract: ['$updatedAt', '$createdAt'] }
          }
        }
      }
    ]);

    // Get solicitor performance
    const solicitorPerformance = await Case.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$assignedSolicitor',
          activeCases: {
            $sum: {
              $cond: [
                {
                  $not: { $in: ['$status', ['closed']] }
                },
                1,
                0
              ]
            }
          },
          closedCases: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'closed'] },
                1,
                0
              ]
            }
          },
          totalResolutionTime: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'closed'] },
                { $subtract: ['$updatedAt', '$createdAt'] },
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'solicitor'
        }
      },
      { $unwind: '$solicitor' }
    ]);

    // Format response
    res.json({
      totalCases,
      openCases,
      closedCases,
      averageResolutionTime: resolutionTime[0] ? 
        Math.round(resolutionTime[0].avgTime / (1000 * 60 * 60 * 24)) : 0, // Convert to days
      casesByStatus: casesByStatus.reduce((acc, { _id, count }) => {
        acc[_id] = count;
        return acc;
      }, {}),
      casesByAreaOfLaw: casesByAreaOfLaw.reduce((acc, { _id, count }) => {
        acc[_id] = count;
        return acc;
      }, {}),
      casesByMonth: casesByMonth.reduce((acc, { _id, count }) => {
        const monthName = new Date(Date.UTC(_id.year, _id.month - 1)).toLocaleString('default', { month: 'short' });
        acc[`${monthName} ${_id.year}`] = count;
        return acc;
      }, {}),
      solicitorPerformance: solicitorPerformance.map(s => ({
        id: s._id,
        name: `${s.solicitor.firstName} ${s.solicitor.lastName}`,
        activeCases: s.activeCases,
        closedCases: s.closedCases,
        avgResolutionTime: s.closedCases ? 
          Math.round(s.totalResolutionTime / s.closedCases / (1000 * 60 * 60 * 24)) : 0 // Convert to days
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

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (typeof verified === 'boolean' && user.role === 'solicitor') {
      await Solicitor.findByIdAndUpdate(userId, { verified });
    }

    if (typeof active === 'boolean') {
      user.active = active;
      await user.save();
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
    const query = {};

    if (startDate && endDate) {
      query['activityLog.timestamp'] = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (type) {
      query['activityLog.action'] = type;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const activities = await Case.aggregate([
      { $unwind: '$activityLog' },
      { $match: query },
      {
        $lookup: {
          from: 'users',
          localField: 'activityLog.performedBy',
          foreignField: '_id',
          as: 'performer'
        }
      },
      { $unwind: '$performer' },
      {
        $project: {
          caseNumber: 1,
          action: '$activityLog.action',
          timestamp: '$activityLog.timestamp',
          details: '$activityLog.details',
          performer: {
            name: { $concat: ['$performer.firstName', ' ', '$performer.lastName'] },
            role: '$performer.role'
          }
        }
      },
      { $sort: { timestamp: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]);

    const totalActivities = await Case.aggregate([
      { $unwind: '$activityLog' },
      { $match: query },
      { $count: 'total' }
    ]);

    res.json({
      activities,
      totalActivities: totalActivities[0]?.total || 0,
      currentPage: parseInt(page),
      totalPages: Math.ceil((totalActivities[0]?.total || 0) / parseInt(limit))
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

    const [currentStats, previousStats] = await Promise.all([
      Case.aggregate([
        {
          $match: {
            createdAt: { $gte: lastMonth }
          }
        },
        {
          $group: {
            _id: null,
            totalCases: { $sum: 1 },
            openCases: {
              $sum: { $cond: [{ $ne: ['$status', 'closed'] }, 1, 0] }
            },
            avgResponseTime: {
              $avg: {
                $cond: [
                  { $eq: ['$status', 'closed'] },
                  { $subtract: ['$updatedAt', '$createdAt'] },
                  null
                ]
              }
            }
          }
        }
      ]),
      Case.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(lastMonth.setMonth(lastMonth.getMonth() - 1)),
              $lt: lastMonth
            }
          }
        },
        {
          $group: {
            _id: null,
            totalCases: { $sum: 1 },
            openCases: {
              $sum: { $cond: [{ $ne: ['$status', 'closed'] }, 1, 0] }
            },
            avgResponseTime: {
              $avg: {
                $cond: [
                  { $eq: ['$status', 'closed'] },
                  { $subtract: ['$updatedAt', '$createdAt'] },
                  null
                ]
              }
            }
          }
        }
      ])
    ]);

    const calculateTrend = (current, previous) => {
      if (!previous) return 0;
      return ((current - previous) / previous) * 100;
    };

    const trends = {
      totalCases: calculateTrend(
        currentStats[0]?.totalCases || 0,
        previousStats[0]?.totalCases || 0
      ),
      openCases: calculateTrend(
        currentStats[0]?.openCases || 0,
        previousStats[0]?.openCases || 0
      ),
      avgResponseTime: calculateTrend(
        currentStats[0]?.avgResponseTime || 0,
        previousStats[0]?.avgResponseTime || 0
      )
    };

    res.json(trends);
  } catch (error) {
    console.error('Error calculating trends:', error);
    res.status(500).json({ message: 'Error calculating trends' });
  }
});

module.exports = router;