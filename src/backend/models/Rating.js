const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

class Rating extends Model {}

Rating.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  solicitorId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'solicitors',
      key: 'id'
    }
  },
  fromUserId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  },
  comment: {
    type: DataTypes.TEXT
  }
}, {
  sequelize,
  modelName: 'Rating',
  tableName: 'ratings',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['solicitorId', 'fromUserId']
    }
  ]
});

module.exports = Rating;