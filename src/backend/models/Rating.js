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
  score: {
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
  hooks: {
    afterCreate: async (rating) => {
      // Update solicitor's average rating
      const ratings = await Rating.findAll({
        where: { solicitorId: rating.solicitorId },
        attributes: [[sequelize.fn('AVG', sequelize.col('score')), 'averageScore']]
      });
      
      await sequelize.models.Solicitor.update(
        { averageRating: ratings[0].dataValues.averageScore },
        { where: { id: rating.solicitorId } }
      );
    }
  }
});

module.exports = Rating;