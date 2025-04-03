const { Sequelize } = require('sequelize');
const config = require('../config/database');

// Initialize Sequelize with database configuration
const sequelize = config.sequelize;

// Test database connection function
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    return true;
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
}

// Import models
const User = require('./User');
const Admin = require('./Admin');
const Client = require('./Client');
const Solicitor = require('./Solicitor');
const { Case, CaseActivity, CaseNote, CaseDeadline } = require('./Case');
const Rating = require('./Rating');

// Initialize models and create tables
async function initializeDatabase() {
  try {
    // Set up associations
    // User associations
    Admin.belongsTo(User, { foreignKey: 'id', onDelete: 'CASCADE' });
    User.hasOne(Admin, { foreignKey: 'id' });

    Client.belongsTo(User, { foreignKey: 'id', onDelete: 'CASCADE' });
    User.hasOne(Client, { foreignKey: 'id' });

    Solicitor.belongsTo(User, { foreignKey: 'id', onDelete: 'CASCADE' });
    User.hasOne(Solicitor, { foreignKey: 'id' });

    // Case associations
    Case.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });
    Case.belongsTo(Solicitor, { foreignKey: 'assignedSolicitorId', as: 'assignedSolicitor' });
    Case.hasMany(CaseActivity, { foreignKey: 'caseId', as: 'activities' });
    Case.hasMany(CaseNote, { foreignKey: 'caseId', as: 'notes' });
    Case.hasMany(CaseDeadline, { foreignKey: 'caseId', as: 'deadlines' });

    // Client associations
    Client.hasMany(Case, { foreignKey: 'clientId', as: 'cases' });

    // Solicitor associations
    Solicitor.hasMany(Case, { foreignKey: 'assignedSolicitorId', as: 'currentCases' });
    Solicitor.hasMany(Rating, { foreignKey: 'solicitorId', as: 'ratings' });

    // Rating associations
    Rating.belongsTo(Solicitor, { foreignKey: 'solicitorId', as: 'solicitor' });
    Rating.belongsTo(User, { foreignKey: 'fromUserId', as: 'rater' });

    // Sync all models with database
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('Database models synchronized successfully.');
    
    // Seed database with initial data if in development mode
    if (process.env.NODE_ENV === 'development') {
      const runSeeders = require('../seeders');
      await runSeeders();
    }

  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Export models and Sequelize instance
module.exports = {
  sequelize,
  Sequelize,
  testConnection,
  initializeDatabase,
  User,
  Admin,
  Client,
  Solicitor,
  Case,
  CaseActivity,
  CaseNote,
  CaseDeadline,
  Rating
};