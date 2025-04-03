const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const User = require('../models/User');

// Get user notifications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('notifications')
      .sort({ 'notifications.createdAt': -1 });

    res.json(user.notifications || []);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

// Mark notification as read
router.patch('/:notificationId/read', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      {
        _id: req.user.userId,
        'notifications._id': req.params.notificationId
      },
      {
        $set: {
          'notifications.$.read': true,
          'notifications.$.readAt': new Date()
        }
      },
      { new: true }
    ).select('notifications');

    if (!user) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json(user.notifications);
  } catch (error) {
    res.status(500).json({ message: 'Error updating notification' });
  }
});

// Delete notification
router.delete('/:notificationId', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      {
        $pull: {
          notifications: { _id: req.params.notificationId }
        }
      },
      { new: true }
    ).select('notifications');

    res.json(user.notifications);
  } catch (error) {
    res.status(500).json({ message: 'Error deleting notification' });
  }
});

// Mark all notifications as read
router.patch('/mark-all-read', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      {
        $set: {
          'notifications.$[].read': true,
          'notifications.$[].readAt': new Date()
        }
      },
      { new: true }
    ).select('notifications');

    res.json(user.notifications);
  } catch (error) {
    res.status(500).json({ message: 'Error updating notifications' });
  }
});

// Helper function to create notification (used internally by other routes)
const createNotification = async (userId, notification) => {
  try {
    await User.findByIdAndUpdate(
      userId,
      {
        $push: {
          notifications: {
            ...notification,
            createdAt: new Date(),
            read: false
          }
        }
      }
    );
    return true;
  } catch (error) {
    console.error('Error creating notification:', error);
    return false;
  }
};

module.exports = {
  router,
  createNotification
};