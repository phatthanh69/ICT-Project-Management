const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const Case = require('../models/Case');
const Solicitor = require('../models/Solicitor');

// Get solicitor dashboard stats
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'solicitor') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const userId = req.user.userId;
    const now = new Date();

    const [
      activeCases,
      completedCases,
      urgentCases,
      pendingCases,
      recentActivity,
      performance
    ] = await Promise.all([
      Case.countDocuments({ 
        assignedSolicitor: userId,
        status: { $nin: ['closed'] }
      }),
      Case.countDocuments({
        assignedSolicitor: userId,
        status: 'closed'
      }),
      Case.countDocuments({
        assignedSolicitor: userId,
        priority: 'urgent',
        status: { $nin: ['closed'] }
      }),
      Case.find({
        assignedSolicitor: userId,
        status: { $nin: ['closed'] }
      })
        .select('type priority status expectedResponseBy')
        .sort({ expectedResponseBy: 1 })
        .limit(5),
      Case.find({ assignedSolicitor: userId })
        .sort({ 'timeline.createdAt': -1 })
        .limit(5)
        .populate('client', 'firstName lastName'),
      Case.aggregate([
        {
          $match: {
            assignedSolicitor: userId,
            status: 'closed'
          }
        },
        {
          $group: {
            _id: null,
            avgResponseTime: {
              $avg: { $subtract: ['$lastUpdated', '$createdAt'] }
            },
            totalCases: { $sum: 1 }
          }
        }
      ])
    ]);

    res.json({
      caseload: {
        activeCases,
        completedCases,
        urgentCases
      },
      pendingCases,
      recentActivity,
      performance: performance[0] ? {
        averageResponseTime: Math.round(performance[0].avgResponseTime / (1000 * 60 * 60)), // Convert to hours
        totalCasesHandled: performance[0].totalCases
      } : {
        averageResponseTime: 0,
        totalCasesHandled: 0
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
    const solicitor = await Solicitor.findById(req.user.userId);

    if (!solicitor) {
      return res.status(404).json({ message: 'Solicitor not found' });
    }

    if (maxCases !== undefined) {
      solicitor.availability.maxCases = maxCases;
    }

    if (availableHours) {
      solicitor.availability.availableHours = availableHours;
    }

    if (vacation) {
      solicitor.availability.vacation = vacation;
    }

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

    const solicitor = await Solicitor.findById(req.user.userId);
    if (!solicitor) {
      return res.status(404).json({ message: 'Solicitor not found' });
    }

    const suggestedCases = await Case.find({
      type: { $in: solicitor.specializations },
      status: 'new',
      assignedSolicitor: { $exists: false }
    })
    .populate('client', 'firstName lastName')
    .sort({ priority: -1, createdAt: 1 })
    .limit(10);

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
    const query = { assignedSolicitor: req.user.userId };

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const performance = await Case.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgResponseTime: {
            $avg: {
              $cond: [
                { $eq: ['$status', 'closed'] },
                { $subtract: ['$lastUpdated', '$createdAt'] },
                null
              ]
            }
          }
        }
      }
    ]);

    const casesByType = await Case.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          resolvedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({
      overall: performance.reduce((acc, p) => {
        acc[p._id] = {
          count: p.count,
          avgResponseTime: p.avgResponseTime ? 
            Math.round(p.avgResponseTime / (1000 * 60 * 60)) : null // Convert to hours
        };
        return acc;
      }, {}),
      byType: casesByType.reduce((acc, c) => {
        acc[c._id] = {
          total: c.count,
          resolved: c.resolvedCount,
          resolutionRate: Math.round((c.resolvedCount / c.count) * 100)
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

    const solicitor = await Solicitor.findByIdAndUpdate(
      req.user.userId,
      { $set: { specializations } },
      { new: true }
    );

    res.json(solicitor);
  } catch (error) {
    res.status(500).json({ message: 'Error updating specializations' });
  }
});

module.exports = router;