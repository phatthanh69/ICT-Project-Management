const dotenv = require('dotenv');
const {
  sequelize,
  User,
  Admin,
  Client,
  Solicitor,
  Case,
  CaseActivity,
  CaseNote,
  Rating,
  initializeDatabase
} = require('../models');

// Load environment variables
dotenv.config();

// Sample data
const adminData = {
  user: {
    email: 'admin@sllslegalclinic.org',
    password: 'admin123',
    firstName: 'System',
    lastName: 'Administrator',
    role: 'admin',
    phone: '020 7123 4567'
  },
  permissions: ['manage_users', 'manage_cases', 'view_reports']
};

const solicitorsData = [
  {
    user: {
      email: 'john.doe@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
      role: 'solicitor',
      phone: '020 7234 5678'
    },
    solicitor: {
      solicitorNumber: 'SOL123456',
      specializations: ['family', 'immigration'],
      firmName: 'Doe & Associates',
      firmStreet: '123 Law Street',
      firmCity: 'London',
      firmPostcode: 'SE1 1AA',
      firmPhone: '020 7234 5679',
      yearsOfExperience: 8,
      verified: true,
      availableHours: 40,
      maxCases: 15
    }
  },
  {
    user: {
      email: 'jane.smith@example.com',
      password: 'password123',
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'solicitor',
      phone: '020 7345 6789'
    },
    solicitor: {
      solicitorNumber: 'SOL123457',
      specializations: ['employment', 'housing'],
      firmName: 'Smith Legal',
      firmStreet: '456 Justice Road',
      firmCity: 'London',
      firmPostcode: 'SE2 2BB',
      firmPhone: '020 7345 6780',
      yearsOfExperience: 12,
      verified: true,
      availableHours: 35,
      maxCases: 12
    }
  }
];

const clientsData = [
  {
    user: {
      email: 'client1@example.com',
      password: 'password123',
      firstName: 'Alice',
      lastName: 'Johnson',
      role: 'client',
      phone: '07700 900123'
    },
    client: {
      street: '789 Client Street',
      city: 'London',
      postcode: 'SE3 3CC',
      dateOfBirth: '1985-06-15',
      nationalInsuranceNumber: 'AB123456C',
      employmentStatus: 'employed',
      income: 35000
    }
  },
  {
    user: {
      email: 'client2@example.com',
      password: 'password123',
      firstName: 'Bob',
      lastName: 'Wilson',
      role: 'client',
      phone: '07700 900456'
    },
    client: {
      street: '321 Resident Lane',
      city: 'London',
      postcode: 'SE4 4DD',
      dateOfBirth: '1990-03-22',
      nationalInsuranceNumber: 'CB456789D',
      employmentStatus: 'self-employed',
      income: 42000
    }
  }
];

// Seed database
async function seedDatabase() {
  try {
    // Initialize database and create tables
    console.log('Initializing database...');
    await initializeDatabase();
    console.log('Database initialized');

    // Start transaction
    const transaction = await sequelize.transaction();

    try {
      // Clear existing data with cascade
      await sequelize.query('TRUNCATE TABLE users CASCADE', { transaction });
      await sequelize.query('TRUNCATE TABLE cases CASCADE', { transaction });
      await sequelize.query('TRUNCATE TABLE ratings CASCADE', { transaction });
      
      console.log('Cleared existing data');

      // Create admin user
      const adminUser = await User.create(adminData.user, { transaction });
      const admin = await Admin.create({
        id: adminUser.id,
        permissions: adminData.permissions
      }, { transaction });
      console.log('Created admin user');

      // Create solicitors
      const createdSolicitors = await Promise.all(
        solicitorsData.map(async (data) => {
          const user = await User.create(data.user, { transaction });
          const solicitor = await Solicitor.create({
            id: user.id,
            ...data.solicitor
          }, { transaction });
          return solicitor;
        })
      );
      console.log('Created solicitors');

      // Create clients
      const createdClients = await Promise.all(
        clientsData.map(async (data) => {
          const user = await User.create(data.user, { transaction });
          const client = await Client.create({
            id: user.id,
            ...data.client
          }, { transaction });
          return client;
        })
      );
      console.log('Created clients');

      // Create cases
      const cases = [
        {
          type: 'immigration',
          status: 'OPEN',
          priority: 'HIGH',
          description: 'Visa application assistance needed for family reunion',
          clientId: createdClients[0].id,
          expectedResponseBy: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        },
        {
          type: 'employment',
          status: 'IN_PROGRESS',
          priority: 'MEDIUM',
          description: 'Unfair dismissal case requiring legal representation',
          clientId: createdClients[1].id,
          assignedSolicitorId: createdSolicitors[0].id,
          expectedResponseBy: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)
        }
      ];

      const createdCases = await Promise.all(
        cases.map(async (caseData) => {
          const newCase = await Case.create(caseData, { transaction });
          
          // Create initial activity
          await CaseActivity.create({
            caseId: newCase.id,
            action: 'Case created',
            performedBy: caseData.clientId,
            details: { status: caseData.status }
          }, { transaction });

          // Create initial note
          await CaseNote.create({
            caseId: newCase.id,
            content: 'Initial case review pending',
            createdBy: admin.id,
            isPrivate: true
          }, { transaction });

          return newCase;
        })
      );

      console.log('Created cases with activities and notes');

      // Create ratings for solicitors
      const ratingsData = [
        {
          solicitorId: createdSolicitors[0].id,
          fromUserId: createdClients[0].id,
          score: 5,
          comment: 'Excellent service, very professional and responsive.'
        },
        {
          solicitorId: createdSolicitors[0].id,
          fromUserId: createdClients[1].id,
          score: 4,
          comment: 'Very helpful with my case, would recommend.'
        },
        {
          solicitorId: createdSolicitors[1].id,
          fromUserId: createdClients[0].id,
          score: 5,
          comment: 'Exceptional legal advice and support throughout my case.'
        }
      ];

      await Promise.all(
        ratingsData.map(async (data) => {
          return await Rating.create(data, { transaction });
        })
      );

      console.log('Created ratings');

      // Add additional case activities
      for (const caseInstance of createdCases) {
        if (caseInstance.assignedSolicitorId) {
          await CaseActivity.create({
            caseId: caseInstance.id,
            action: 'Solicitor assigned',
            performedBy: admin.id,
            details: { solicitorId: caseInstance.assignedSolicitorId }
          }, { transaction });

          await CaseActivity.create({
            caseId: caseInstance.id,
            action: 'Case review started',
            performedBy: caseInstance.assignedSolicitorId,
            details: { status: 'IN_PROGRESS' }
          }, { transaction });
        }
      }

      console.log('Added case activities');

      // Commit transaction
      await transaction.commit();
      console.log('Database seeded successfully');
      process.exit(0);
    } catch (error) {
      // Rollback transaction on error
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Connect and seed
sequelize
  .authenticate()
  .then(() => {
    console.log('Connected to PostgreSQL');
    return seedDatabase();
  })
  .catch(err => {
    console.error('PostgreSQL connection error:', err);
    process.exit(1);
  });
