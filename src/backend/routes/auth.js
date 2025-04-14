const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { User, Client, Solicitor, Admin } = require('../models');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize'); // Add this import for the reset password function

// Validation middleware
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
  body('phone').trim().notEmpty(),
  body('role').isIn(['client', 'solicitor', 'admin']) // Added 'admin' as valid role
];

// Login validation
const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

// Register new user
router.post('/register', registerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName, phone, role, ...additionalData } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user based on role
    let user;
    if (role === 'client') {
      user = await Client.create({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        role,
        ...additionalData
      });
    } else if (role === 'solicitor') {
      user = await Solicitor.create({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        role,
        ...additionalData,
        verified: false
      });
    } else if (role === 'admin') {
      user = await Admin.create({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        role,
        ...additionalData,
        permissions: additionalData.permissions || { fullAccess: true }
      });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Error registering user' });
  }
});

// Login user
router.post('/login', loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    console.log('Login attempt:', req.body);
    const email = req.body.email.toLowerCase();
    const password = req.body.password;
    
    // Find user with password included and proper model loading
    const user = await User.scope('withPassword').findOne({
      where: { email: email.toLowerCase() },
      include: [
        { model: Admin, as: 'adminProfile', required: false },
        { model: Client, as: 'clientProfile', required: false },
        { model: Solicitor, as: 'solicitorProfile', required: false }
      ]
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Debug output
    console.log('User found:', user.email);

    // Check if password exists in the database record
    if (!user.password) {
      console.error('Password field is missing for user:', user.email);
      return res.status(401).json({ message: 'Authentication error. Please contact support.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // If role was specified in request and doesn't match, reject
    if (req.body.role && user.role !== req.body.role) {
      return res.status(403).json({ message: 'User does not have the specified role' });
    }

    // Update last login
    await user.update({ lastLogin: new Date() });

    // Get role-specific data
    let userData;
    switch (user.role) {
      case 'admin':
        userData = await Admin.findByPk(user.id);
        break;
      case 'solicitor':
        userData = await Solicitor.findByPk(user.id, {
          include: ['currentCases']
        });
        break;
      case 'client':
        userData = await Client.findByPk(user.id, {
          include: ['cases']
        });
        break;
      default:
        userData = user;
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: userData.id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        permissions: userData.permissions
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error during login' });
  }
});

// Auth middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded:', decoded); // Keep this debug log
    
    // Load user with the right model based on role
    let user;
    
    // First, check if the user exists in the base User model
    const baseUser = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password'] }
    });
    
    if (!baseUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Then load the specific role model data
    switch (decoded.role) {
      case 'admin':
        user = await Admin.findByPk(decoded.userId, {
          attributes: { exclude: ['password'] }
        });
        break;
      case 'solicitor':
        user = await Solicitor.findByPk(decoded.userId, {
          attributes: { exclude: ['password'] },
          include: ['currentCases']
        });
        break;
      case 'client':
        user = await Client.findByPk(decoded.userId, {
          attributes: { exclude: ['password'] },
          include: ['cases']
        });
        break;
      default:
        // If role is not recognized, just use the base user data
        user = baseUser;
    }

    // If specific role model wasn't found but base user exists, use base user
    if (!user && baseUser) {
      console.warn(`Role-specific model not found for role: ${decoded.role}, using base user`);
      user = baseUser;
    }

    // Merge base user data with role-specific data
    const mergedUser = {
      ...baseUser.toJSON(),
      ...(user ? user.toJSON() : {}),
      role: decoded.role // Ensure role is always set from the token
    };
    
    console.log('User with role assigned:', { id: mergedUser.id, role: mergedUser.role });

    req.user = mergedUser;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // The user object should already have the correct role and data from authenticateToken
    if (!req.user || !req.user.role) {
      throw new Error('User data or role is missing');
    }

    console.log('Sending user data:', {
      id: req.user.id,
      role: req.user.role,
      email: req.user.email
    });

    // Send the merged user data
    res.json(req.user);
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ message: 'Error fetching user data' });
  }
});

// Password reset request
router.post('/reset-password-request',
  body('email').isEmail().normalizeEmail(),
  async (req, res) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ where: { email } });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const resetToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET + user.password,
        { expiresIn: '1h' }
      );

      await user.update({
        resetPasswordToken: resetToken,
        resetPasswordExpires: new Date(Date.now() + 3600000) // 1 hour
      });

      res.json({
        message: 'Password reset instructions sent',
        resetToken // In production, send via email
      });
    } catch (error) {
      res.status(500).json({ message: 'Error requesting password reset' });
    }
});

// Reset password with token
router.post('/reset-password/:token',
  body('password').isLength({ min: 8 }),
  async (req, res) => {
    try {
      const { password } = req.body;
      const { token } = req.params;

      const user = await User.findOne({
        where: {
          resetPasswordToken: token,
          resetPasswordExpires: { [Op.gt]: new Date() }
        }
      });

      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      await user.update({
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null
      });

      res.json({ message: 'Password reset successful' });
    } catch (error) {
      res.status(500).json({ message: 'Error resetting password' });
    }
});

// Change password
router.post('/change-password', authenticateToken, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 })
], async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await User.findByPk(req.user.id);

      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await user.update({ password: hashedPassword });

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error changing password' });
    }
});

// Update profile
router.patch('/profile', authenticateToken, [
  body('firstName').optional().trim().notEmpty(),
  body('lastName').optional().trim().notEmpty(),
  body('phone').optional().trim().notEmpty()
], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const allowedUpdates = ['firstName', 'lastName', 'phone', 'preferences'];
      const updates = Object.keys(req.body)
        .filter(key => allowedUpdates.includes(key))
        .reduce((obj, key) => {
          obj[key] = req.body[key];
          return obj;
        }, {});

      await req.user.update(updates);
      const updatedUser = await User.findByPk(req.user.id, {
        attributes: { exclude: ['password'] }
      });

      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: 'Error updating profile' });
    }
});

module.exports = {
  router,
  authenticateToken
};