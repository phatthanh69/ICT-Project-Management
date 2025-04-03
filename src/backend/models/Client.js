const { DataTypes } = require('sequelize');
const User = require('./User');
const { sequelize } = require('../config/database');

class Client extends User {}

Client.init({
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  street: {
    type: DataTypes.STRING
  },
  city: {
    type: DataTypes.STRING
  },
  postcode: {
    type: DataTypes.STRING
  },
  dateOfBirth: {
    type: DataTypes.DATE
  },
  nationalInsuranceNumber: {
    type: DataTypes.STRING,
    unique: true,
    validate: {
      // UK NI number format validation
      is: /^[A-CEGHJ-PR-TW-Z]{1}[A-CEGHJ-NPR-TW-Z]{1}[0-9]{6}[A-D]{1}$/i
    }
  },
  employmentStatus: {
    type: DataTypes.ENUM('employed', 'self-employed', 'unemployed', 'student', 'retired', 'other')
  },
  income: {
    type: DataTypes.DECIMAL(10, 2),
    validate: {
      min: 0
    }
  }
}, {
  sequelize,
  modelName: 'Client',
  tableName: 'clients'
});

module.exports = Client;