const seedUsers = require('./userSeeder');
const seedAdmins = require('./adminSeeder');
const seedSolicitors = require('./solicitorSeeder');
const seedClients = require('./clientSeeder');
const seedCases = require('./caseSeeder');
const seedRatings = require('./ratingSeeder');

async function runSeeders() {
  console.log('Running database seeders...');
  
  try {
    // Step 1: Seed users (must come first as other seeders depend on user IDs)
    const createdUsers = await seedUsers();
    
    // Step 2: Seed profile data for different user types
    await seedAdmins(createdUsers);
    await seedSolicitors(createdUsers);
    await seedClients(createdUsers);
    
    // Step 3: Seed related data that depends on users and profiles
    await seedCases(createdUsers);
    await seedRatings(createdUsers);
    
    console.log('All seeders completed successfully');
  } catch (error) {
    console.error('Error running seeders:', error);
    throw error;
  }
}

module.exports = runSeeders;
