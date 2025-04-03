const { Client } = require('../models');

const clientData = [
  {
    email: 'james.wilson@example.com',
    street: '78 High Street',
    city: 'Birmingham',
    postcode: 'B1 1TT',
    dateOfBirth: new Date('1985-06-15'),
    nationalInsuranceNumber: 'AB123456C',
    employmentStatus: 'employed',
    income: 32000.00
  },
  {
    email: 'emma.brown@example.com',
    street: '27 Park Avenue',
    city: 'Leeds',
    postcode: 'LS1 5QR',
    dateOfBirth: new Date('1990-11-23'),
    nationalInsuranceNumber: 'CE789012A',
    employmentStatus: 'self-employed',
    income: 26500.00
  }
];

const seedClients = async (users) => {
  try {
    console.log('Seeding client profiles...');
    
    for (const data of clientData) {
      const clientUser = users[data.email];
      
      if (clientUser) {
        const [client, created] = await Client.findOrCreate({
          where: { id: clientUser.id },
          defaults: {
            id: clientUser.id,
            street: data.street,
            city: data.city,
            postcode: data.postcode,
            dateOfBirth: data.dateOfBirth,
            nationalInsuranceNumber: data.nationalInsuranceNumber,
            employmentStatus: data.employmentStatus,
            income: data.income
          }
        });
        
        if (created) {
          console.log(`Created client profile for: ${data.email}`);
        } else {
          console.log(`Client profile already exists for: ${data.email}`);
        }
      }
    }
    
  } catch (error) {
    console.error('Error seeding clients:', error);
    throw error;
  }
};

module.exports = seedClients;
