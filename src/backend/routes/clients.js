const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const Case = require('../models/Case');
const Client = require('../models/Client');

// Get client dashboard stats
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'client') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const userId = req.user.userId;

    const [
      totalCases,
      activeCases,
      resolvedCases,
      urgentCases,
      recentActivity
    ] = await Promise.all([
      Case.countDocuments({ client: userId }),
      Case.countDocuments({ client: userId, status: { $nin: ['resolved', 'closed'] } }),
      Case.countDocuments({ client: userId, status: 'resolved' }),
      Case.countDocuments({ client: userId, priority: 'urgent', status: { $nin: ['resolved', 'closed'] } }),
      Case.find({ client: userId })
        .sort({ 'timeline.createdAt': -1 })
        .limit(5)
        .populate('assignedSolicitor', 'firstName lastName')
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

    const communications = await Case.aggregate([
      { $match: { client: req.user.userId } },
      { $unwind: '$notes' },
      { $match: { 'notes.isInternal': false } },
      {
        $lookup: {
          from: 'users',
          localField: 'notes.author',
          foreignField: '_id',
          as: 'author'
        }
      },
      { $unwind: '$author' },
      {
        $project: {
          caseId: '$_id',
          caseType: '$type',
          noteId: '$notes._id',
          content: '$notes.content',
          createdAt: '$notes.createdAt',
          author: {
            name: { $concat: ['$author.firstName', ' ', '$author.lastName'] },
            role: '$author.role'
          }
        }
      },
      { $sort: { createdAt: -1 } }
    ]);

    res.json(communications);
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

    const client = await Client.findById(req.user.userId)
      .select('-password')
      .populate('cases', 'type status priority');

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json(client);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching client profile' });
  }
});

module.exports = router;