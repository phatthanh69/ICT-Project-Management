const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const { User, Notification } = require('../models');
const { Op } = require('sequelize');

// Get user notifications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { userId: req.user.userId },
      order: [['createdAt', 'DESC']]
    });

    res.json(notifications || []);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

// Mark notification as read
router.patch('/:notificationId/read', authenticateToken, async (req, res) => {
  try {
    const updated = await Notification.update(
      {
        read: true,
        readAt: new Date()
      },
      {
        where: {
          id: req.params.notificationId,
          userId: req.user.userId
        },
        returning: true
      }
    );

    if (updated[0] === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    const notifications = await Notification.findAll({
      where: { userId: req.user.userId },
      order: [['createdAt', 'DESC']]
    });

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Error updating notification' });
  }
});

// Delete notification
router.delete('/:notificationId', authenticateToken, async (req, res) => {
  try {
    await Notification.destroy({
      where: {
        id: req.params.notificationId,
        userId: req.user.userId
      }
    });

    const notifications = await Notification.findAll({
      where: { userId: req.user.userId },
      order: [['createdAt', 'DESC']]
    });

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Error deleting notification' });
  }
});

// Mark all notifications as read
router.patch('/mark-all-read', authenticateToken, async (req, res) => {
  try {
    await Notification.update(
      {
        read: true,
        readAt: new Date()
      },
      {
        where: { userId: req.user.userId }
      }
    );

    const notifications = await Notification.findAll({
      where: { userId: req.user.userId },
      order: [['createdAt', 'DESC']]
    });

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Error updating notifications' });
  }
});

// Helper function to create notification (used internally by other routes)
const createNotification = async (userId, notification) => {
  try {
    await Notification.create({
      ...notification,
      userId,
      createdAt: new Date(),
      read: false
    });
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