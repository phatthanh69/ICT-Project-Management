const { Sequelize } = require('sequelize');
const config = require('../config/database');

// Initialize Sequelize with database configuration
const sequelize = config.sequelize;

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
    Client.belongsTo(User, { foreignKey: 'id', onDelete: 'CASCADE' });
    Solicitor.belongsTo(User, { foreignKey: 'id', onDelete: 'CASCADE' });

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

    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

// Export models and Sequelize instance
module.exports = {
  sequelize,
  Sequelize,
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