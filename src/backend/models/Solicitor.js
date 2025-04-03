const { DataTypes } = require('sequelize');
const User = require('./User');
const { sequelize } = require('../config/database');

class Solicitor extends User {
  async canTakeNewCase() {
    const currentCaseCount = await this.countCurrentCases();
    return currentCaseCount < (this.maxCases || 10) && this.verified;
  }

  async countCurrentCases() {
    return await sequelize.models.Case.count({
      where: { 
        assignedSolicitorId: this.id,
        status: {
          [sequelize.Sequelize.Op.notIn]: ['CLOSED']
        }
      }
    });
  }
}

Solicitor.init({
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  solicitorNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  specializations: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false,
    defaultValue: [],
    validate: {
      isValidSpecialization(value) {
        const validTypes = [
          'family',
          'immigration',
          'housing',
          'employment',
          'civil',
          'criminal',
          'other'
        ];
        if (!value.every(type => validTypes.includes(type))) {
          throw new Error('Invalid specialization type');
        }
      }
    }
  },
  firmName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  firmStreet: {
    type: DataTypes.STRING
  },
  firmCity: {
    type: DataTypes.STRING
  },
  firmPostcode: {
    type: DataTypes.STRING
  },
  firmPhone: {
    type: DataTypes.STRING
  },
  yearsOfExperience: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  availableHours: {
    type: DataTypes.INTEGER,
    defaultValue: 40,
    validate: {
      min: 0,
      max: 168 // Max hours in a week
    }
  },
  maxCases: {
    type: DataTypes.INTEGER,
    defaultValue: 10,
    validate: {
      min: 1
    }
  },
  averageRating: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0,
    validate: {
      min: 0,
      max: 5
    }
  }
}, {
  sequelize,
  modelName: 'Solicitor',
  tableName: 'solicitors'
});

module.exports = Solicitor;