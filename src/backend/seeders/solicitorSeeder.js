const { Solicitor } = require('../models');

const solicitorData = [
  {
    email: 'john.smith@lawfirm.com',
    solicitorNumber: 'SOL12345',
    specializations: ['family', 'immigration'],
    firmName: 'Smith & Partners LLP',
    firmStreet: '123 Law Street',
    firmCity: 'London',
    firmPostcode: 'EC1A 1BB',
    firmPhone: '020 7123 4567',
    yearsOfExperience: 8,
    verified: true,
    availableHours: 35,
    maxCases: 15,
    averageRating: 4.5
  },
  {
    email: 'sarah.jackson@legalaid.org',
    solicitorNumber: 'SOL67890',
    specializations: ['housing', 'employment', 'civil'],
    firmName: 'Legal Aid Services',
    firmStreet: '45 Justice Road',
    firmCity: 'Manchester',
    firmPostcode: 'M1 2AB',
    firmPhone: '0161 987 6543',
    yearsOfExperience: 12,
    verified: true,
    availableHours: 40,
    maxCases: 20,
    averageRating: 4.8
  }
];

const seedSolicitors = async (users) => {
  try {
    console.log('Seeding solicitor profiles...');
    
    for (const data of solicitorData) {
      const solicitorUser = users[data.email];
      
      if (solicitorUser) {
        const [solicitor, created] = await Solicitor.findOrCreate({
          where: { id: solicitorUser.id },
          defaults: {
            id: solicitorUser.id,
            solicitorNumber: data.solicitorNumber,
            specializations: data.specializations,
            firmName: data.firmName,
            firmStreet: data.firmStreet,
            firmCity: data.firmCity,
            firmPostcode: data.firmPostcode,
            firmPhone: data.firmPhone,
            yearsOfExperience: data.yearsOfExperience,
            verified: data.verified,
            availableHours: data.availableHours,
            maxCases: data.maxCases,
            averageRating: data.averageRating
          }
        });
        
        if (created) {
          console.log(`Created solicitor profile for: ${data.email}`);
        } else {
          console.log(`Solicitor profile already exists for: ${data.email}`);
        }
      }
    }
    
  } catch (error) {
    console.error('Error seeding solicitors:', error);
    throw error;
  }
};

module.exports = seedSolicitors;
