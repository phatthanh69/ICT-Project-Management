const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Admin extends Model {}

Admin.init({
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
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

module.exports = Admin;