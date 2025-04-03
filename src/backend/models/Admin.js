const { DataTypes } = require('sequelize');
const User = require('./User');
const { sequelize } = require('../config/database');

class Admin extends User {
  static isAdmin(user) {
    return user instanceof Admin;
  }
}

Admin.init({
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    references: {
      model: User,
      key: 'id'
    }
  },
  permissions: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false,
    defaultValue: ['manage_users', 'manage_cases', 'view_reports'],
    validate: {
      isValidPermission(value) {
        const validPermissions = [
          'manage_users',
          'manage_cases',
          'view_reports',
          'system_config'
        ];
        if (!value.every(permission => validPermissions.includes(permission))) {
          throw new Error('Invalid permission value');
        }
      }
    }
  }
}, {
  sequelize,
  modelName: 'Admin',
  tableName: 'admins'
});

// Setup associations
Admin.belongsTo(User, { 
  foreignKey: 'id',
  constraints: true,
  onDelete: 'CASCADE' 
});

module.exports = Admin;