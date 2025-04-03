const { Rating } = require('../models');

const seedRatings = async (users) => {
  try {
    console.log('Seeding ratings...');
    
    const clientUser1 = users['james.wilson@example.com'];
    const clientUser2 = users['emma.brown@example.com'];
    const solicitorUser1 = users['john.smith@lawfirm.com'];
    const solicitorUser2 = users['sarah.jackson@legalaid.org'];
    
    if (!clientUser1 || !clientUser2 || !solicitorUser1 || !solicitorUser2) {
      console.log('Missing required users for rating seeding');
      return;
    }
    
    // Rating data
    const ratingsData = [
      {
        solicitorId: solicitorUser1.id,
        fromUserId: clientUser1.id,
        rating: 4,
        comment: 'Very professional and helpful with my case. Communication was excellent.'
      },
      {
        solicitorId: solicitorUser2.id,
        fromUserId: clientUser2.id,
        rating: 5,
        comment: 'Extremely knowledgeable and responsive. Went above and beyond expectations.'
      }
    ];
    
    for (const data of ratingsData) {
      const [rating, created] = await Rating.findOrCreate({
        where: {
          solicitorId: data.solicitorId,
          fromUserId: data.fromUserId
        },
        defaults: data
      });
      
      if (created) {
        console.log(`Created rating for solicitor from user: ${data.fromUserId}`);
      } else {
        console.log(`Rating already exists for this solicitor and user combination`);
      }
    }
    
  } catch (error) {
    console.error('Error seeding ratings:', error);
    throw error;
  }
};

module.exports = seedRatings;
