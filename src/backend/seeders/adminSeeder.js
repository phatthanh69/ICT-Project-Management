const { Admin } = require('../models');

const seedAdmins = async (users) => {
  try {
    console.log('Seeding admin profiles...');
    
    // Admin data
    const adminUser = users['admin@justicehub.org'];
    
    if (adminUser) {
      const [admin, created] = await Admin.findOrCreate({
        where: { id: adminUser.id },
        defaults: {
          id: adminUser.id,
          permissions: ['manage_users', 'manage_cases', 'view_reports', 'system_config']
        }
      });
      
      if (created) {
        console.log(`Created admin profile for: ${adminUser.email}`);
      } else {
        console.log(`Admin profile already exists for: ${adminUser.email}`);
      }
    }
    
  } catch (error) {
    console.error('Error seeding admins:', error);
    throw error;
  }
};

module.exports = seedAdmins;
