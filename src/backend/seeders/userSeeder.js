const { User } = require('../models');

const users = [
  // Admin user
  {
    email: 'admin@justicehub.org',
    password: 'Admin123!',
    firstName: 'System',
    lastName: 'Administrator',
    role: 'admin',
    phone: '07700900000'
  },
  // Solicitor users
  {
    email: 'john.smith@lawfirm.com',
    password: 'Solicitor123!',
    firstName: 'John',
    lastName: 'Smith',
    role: 'solicitor',
    phone: '07700900101'
  },
  {
    email: 'sarah.jackson@legalaid.org',
    password: 'Solicitor123!',
    firstName: 'Sarah',
    lastName: 'Jackson',
    role: 'solicitor',
    phone: '07700900102'
  },
  // Client users
  {
    email: 'james.wilson@example.com',
    password: 'Client123!',
    firstName: 'James',
    lastName: 'Wilson',
    role: 'client',
    phone: '07700900201'
  },
  {
    email: 'emma.brown@example.com',
    password: 'Client123!',
    firstName: 'Emma',
    lastName: 'Brown',
    role: 'client',
    phone: '07700900202'
  }
];

const seedUsers = async () => {
  try {
    console.log('Seeding users...');
    const createdUsers = {};
    
    for (const userData of users) {
      const [user, created] = await User.findOrCreate({
        where: { email: userData.email },
        defaults: userData
      });
      
      // Store the created users by email for later reference
      createdUsers[userData.email] = user;
      
      if (created) {
        console.log(`Created user: ${userData.email}`);
      } else {
        console.log(`User already exists: ${userData.email}`);
      }
    }
    
    return createdUsers;
  } catch (error) {
    console.error('Error seeding users:', error);
    throw error;
  }
};

module.exports = seedUsers;
