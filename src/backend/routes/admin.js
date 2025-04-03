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
          model: Solicitor,
          as: 'assignedSolicitor',
          include: [{
            model: User,
            as: 'User',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }]
        },
        {
          model: Client,
          as: 'client',
          include: [{
            model: User,
            as: 'User',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }]
        }
      ],
      order: [['createdAt', 'DESC']],
      offset,
      limit: limitNum
    });

    // Ensure all cases have proper structure for front-end
    const normalizedCases = cases.map(caseItem => {
      const plainCase = caseItem.get({ plain: true });
      
      // Ensure consistent IDs - frontend expects either id or _id
      plainCase.id = plainCase.id || plainCase._id;
      
      return plainCase;
    });

    const totalPages = Math.ceil(totalCases / limitNum);

    res.json({
      cases: normalizedCases,
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

// Get a specific case by ID
router.get('/cases/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`Fetching case with ID: ${id}`);
    
    const caseItem = await Case.findByPk(id, {
      include: [
        {
          model: Solicitor,
          as: 'assignedSolicitor',
          include: [{
            model: User,
            as: 'User',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber']
          }]
        },
        {
          model: Client,
          as: 'client',
          include: [{
            model: User,
            as: 'User',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber']
          }]
        },
        // Include any other relevant associations
      ]
    });
    
    if (!caseItem) {
      return res.status(404).json({ message: 'Case not found' });
    }
    
    // Convert to plain object and ensure ID consistency
    const plainCase = caseItem.get({ plain: true });
    plainCase.id = plainCase.id || plainCase._id;
    
    res.json(plainCase);
  } catch (error) {
    console.error('Error fetching case details:', error);
    res.status(500).json({ 
      message: 'Error fetching case details',
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

// Get reports
router.get('/reports', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { timeRange } = req.query;
    const now = new Date();
    let startDate = new Date();

    // Calculate start date based on time range
    switch (timeRange) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 1); // Default to last month
    }

    // Get basic stats
    const totalCases = await Case.count({ 
      where: { createdAt: { [Op.gte]: startDate } } 
    });
    
    const openCases = await Case.count({
      where: {
        createdAt: { [Op.gte]: startDate },
        status: { [Op.ne]: 'CLOSED' }
      }
    });
    
    const closedCases = await Case.count({
      where: {
        createdAt: { [Op.gte]: startDate },
        status: 'CLOSED'
      }
    });

    // Get cases by status
    const statusResults = await Case.findAll({
      attributes: [
        'status',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      where: { createdAt: { [Op.gte]: startDate } },
      group: ['status'],
      raw: true
    });

    // Get cases by area of law (type)
    const areaResults = await Case.findAll({
      attributes: [
        'type',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      where: { createdAt: { [Op.gte]: startDate } },
      group: ['type'],
      raw: true
    });

    // Get cases by month
    const monthResults = await Case.findAll({
      attributes: [
        [Sequelize.fn('to_char', Sequelize.col('createdAt'), 'Mon YYYY'), 'month'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      where: { createdAt: { [Op.gte]: startDate } },
      group: [Sequelize.fn('to_char', Sequelize.col('createdAt'), 'Mon YYYY')],
      order: [[Sequelize.fn('MIN', Sequelize.col('createdAt')), 'ASC']],
      raw: true
    });

    // Calculate average resolution time for closed cases
    const closedCasesData = await Case.findAll({
      where: {
        createdAt: { [Op.gte]: startDate },
        status: 'CLOSED'
      },
      raw: true
    });

    let avgResolutionTime = 0;
    if (closedCasesData.length > 0) {
      const totalDays = closedCasesData.reduce((sum, caseItem) => {
        const createdDate = new Date(caseItem.createdAt);
        const closedDate = new Date(caseItem.updatedAt);
        const diffTime = Math.abs(closedDate - createdDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return sum + diffDays;
      }, 0);
      avgResolutionTime = Math.round(totalDays / closedCasesData.length);
    }

    // Get solicitor performance data
    const solicitors = await Solicitor.findAll({
      include: [{
        model: User,
        as: 'User',
        attributes: ['firstName', 'lastName']
      }]
    });

    const solicitorPerformance = [];
    for (const solicitor of solicitors) {
      const activeCases = await Case.count({
        where: {
          assignedSolicitorId: solicitor.id,
          status: { [Op.ne]: 'CLOSED' },
          createdAt: { [Op.gte]: startDate }
        }
      });

      const closedCasesForSolicitor = await Case.findAll({
        where: {
          assignedSolicitorId: solicitor.id,
          status: 'CLOSED',
          createdAt: { [Op.gte]: startDate }
        },
        raw: true
      });

      let avgResolutionTimeForSolicitor = 0;
      if (closedCasesForSolicitor.length > 0) {
        const totalDays = closedCasesForSolicitor.reduce((sum, caseItem) => {
          const createdDate = new Date(caseItem.createdAt);
          const closedDate = new Date(caseItem.updatedAt);
          const diffTime = Math.abs(closedDate - createdDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return sum + diffDays;
        }, 0);
        avgResolutionTimeForSolicitor = Math.round(totalDays / closedCasesForSolicitor.length);
      }

      solicitorPerformance.push({
        id: solicitor.id,
        name: `${solicitor.User.firstName} ${solicitor.User.lastName}`,
        activeCases,
        closedCases: closedCasesForSolicitor.length,
        avgResolutionTime: avgResolutionTimeForSolicitor
      });
    }

    // Format response data
    const casesByStatus = {};
    statusResults.forEach(item => {
      casesByStatus[item.status] = parseInt(item.count);
    });

    const casesByAreaOfLaw = {};
    areaResults.forEach(item => {
      casesByAreaOfLaw[item.type] = parseInt(item.count);
    });

    const casesByMonth = {};
    monthResults.forEach(item => {
      casesByMonth[item.month] = parseInt(item.count);
    });

    res.json({
      totalCases,
      openCases,
      closedCases,
      averageResolutionTime: avgResolutionTime,
      casesByStatus,
      casesByAreaOfLaw,
      casesByMonth,
      solicitorPerformance
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

module.exports = router;