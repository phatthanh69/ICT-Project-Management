const { Model, DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');

class Case extends Model {
  needsAttention() {
    const now = new Date();
    return (
      (this.expectedResponseBy && now > this.expectedResponseBy) ||
      (this.deadline && now > new Date(this.deadline.getTime() - 24 * 60 * 60 * 1000))
    );
  }

  async addActivity(action, userId, details = {}) {
    const activity = await CaseActivity.create({
      caseId: this.id,
      action,
      performedBy: userId,
      details: details
    });
    return activity;
  }
}

Case.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  caseNumber: {
    type: DataTypes.STRING,
    unique: true
  },
  clientId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'clients',
      key: 'id'
    }
  },
  assignedSolicitorId: {
    type: DataTypes.UUID,
    references: {
      model: 'solicitors',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM('family', 'immigration', 'housing', 'employment', 'civil', 'criminal', 'other'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('OPEN', 'IN_PROGRESS', 'CLOSED', 'PENDING_REVIEW', 'AWAITING_CLIENT', 'ON_HOLD'),
    defaultValue: 'OPEN'
  },
  priority: {
    type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT'),
    defaultValue: 'MEDIUM'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  deadline: {
    type: DataTypes.DATE
  },
  expectedResponseBy: {
    type: DataTypes.DATE,
    defaultValue: () => {
      const date = new Date();
      date.setHours(date.getHours() + 48); // 48 hours from creation
      return date;
    }
  }
}, {
  sequelize,
  modelName: 'Case',
  tableName: 'cases',
  timestamps: true,
  hooks: {
    beforeValidate: async (caseInstance) => {
      try {
        if (!caseInstance.caseNumber) {
          const date = new Date();
          const year = date.getFullYear().toString().substr(-2);
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const prefix = `SLLS-${year}${month}-`;
          
          let nextNumber = 1;
          try {
            // Find the latest case number for this month and year
            const latestCase = await Case.findOne({
              where: {
                caseNumber: {
                  [Op.like]: `${prefix}%`
                }
              },
              order: [['caseNumber', 'DESC']],
              raw: true
            });
            
            if (latestCase && latestCase.caseNumber) {
              const lastNumber = parseInt(latestCase.caseNumber.split('-')[2], 10);
              if (!isNaN(lastNumber)) {
                nextNumber = lastNumber + 1;
              }
            }
          } catch (error) {
            console.log('Warning: Could not fetch latest case number, using default');
          }
          
          caseInstance.caseNumber = `${prefix}${nextNumber.toString().padStart(4, '0')}`;
        }
      } catch (error) {
        console.error('Error in beforeValidate hook:', error);
        // Don't throw the error - if we can't generate a case number, let the validation handle it
      }
    }
  }
});

// Define CaseActivity model for timeline and activity tracking
class CaseActivity extends Model {}

CaseActivity.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  caseId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'cases',
      key: 'id'
    }
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false
  },
  performedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  details: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  sequelize,
  modelName: 'CaseActivity',
  tableName: 'case_activities',
  timestamps: true
});

// Define CaseNote model for case notes
class CaseNote extends Model {}

CaseNote.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  caseId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'cases',
      key: 'id'
    }
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  isPrivate: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  sequelize,
  modelName: 'CaseNote',
  tableName: 'case_notes',
  timestamps: true
});

// Define CaseDeadline model for multiple deadlines
class CaseDeadline extends Model {}

CaseDeadline.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  caseId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'cases',
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  completed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  sequelize,
  modelName: 'CaseDeadline',
  tableName: 'case_deadlines',
  timestamps: true
});

// Export the models
module.exports = {
  Case,
  CaseActivity,
  CaseNote,
  CaseDeadline
};