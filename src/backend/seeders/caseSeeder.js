const { Case, CaseNote, CaseActivity, CaseDeadline } = require('../models');

const seedCases = async (users) => {
  try {
    console.log('Seeding cases and related data...');
    
    // Get user IDs for reference
    const clientUser1 = users['james.wilson@example.com'];
    const clientUser2 = users['emma.brown@example.com'];
    const solicitorUser1 = users['john.smith@lawfirm.com'];
    const solicitorUser2 = users['sarah.jackson@legalaid.org'];
    
    if (!clientUser1 || !clientUser2 || !solicitorUser1 || !solicitorUser2) {
      console.log('Missing required users for case seeding');
      return;
    }
    
    // Case data
    const casesData = [
      {
        caseNumber: 'SLLS-2301-0001',
        clientId: clientUser1.id,
        assignedSolicitorId: solicitorUser1.id,
        type: 'family',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        description: 'Child custody dispute following separation',
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        notes: [
          {
            content: 'Initial consultation completed. Client seeking full custody.',
            isPrivate: false
          },
          {
            content: 'Document preparation in progress. Need to follow up on financial statements.',
            isPrivate: true
          }
        ],
        activities: [
          {
            action: 'CASE_CREATED',
            details: { message: 'Case opened in system' }
          },
          {
            action: 'SOLICITOR_ASSIGNED',
            details: { solicitorName: 'John Smith' }
          },
          {
            action: 'DOCUMENT_UPLOADED',
            details: { documentName: 'Intake Form.pdf' }
          }
        ],
        deadlines: [
          {
            title: 'File court papers',
            date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
            completed: false
          },
          {
            title: 'Client meeting to review documents',
            date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            completed: false
          }
        ]
      },
      {
        caseNumber: 'SLLS-2301-0002',
        clientId: clientUser2.id,
        assignedSolicitorId: solicitorUser2.id,
        type: 'housing',
        status: 'OPEN',
        priority: 'HIGH',
        description: 'Landlord eviction dispute - alleged property damage',
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        notes: [
          {
            content: 'Client facing eviction with 14-day notice. Dispute over alleged property damage.',
            isPrivate: false
          }
        ],
        activities: [
          {
            action: 'CASE_CREATED',
            details: { message: 'Case opened in system' }
          },
          {
            action: 'SOLICITOR_ASSIGNED',
            details: { solicitorName: 'Sarah Jackson' }
          }
        ],
        deadlines: [
          {
            title: 'File response to eviction notice',
            date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
            completed: false
          }
        ]
      }
    ];
    
    // Create cases and related data
    for (const caseData of casesData) {
      // Extract related data
      const { notes, activities, deadlines, ...caseDetails } = caseData;
      
      // Find or create the case
      const [caseInstance, created] = await Case.findOrCreate({
        where: { caseNumber: caseDetails.caseNumber },
        defaults: caseDetails
      });
      
      if (created) {
        console.log(`Created case: ${caseDetails.caseNumber}`);
        
        // Create case notes
        if (notes && notes.length) {
          for (const note of notes) {
            await CaseNote.create({
              caseId: caseInstance.id,
              content: note.content,
              isPrivate: note.isPrivate,
              createdBy: caseDetails.assignedSolicitorId // Assign to solicitor
            });
          }
          console.log(`Added ${notes.length} notes to case ${caseDetails.caseNumber}`);
        }
        
        // Create case activities
        if (activities && activities.length) {
          for (const activity of activities) {
            await CaseActivity.create({
              caseId: caseInstance.id,
              action: activity.action,
              performedBy: caseDetails.assignedSolicitorId, // Assign to solicitor
              details: activity.details
            });
          }
          console.log(`Added ${activities.length} activities to case ${caseDetails.caseNumber}`);
        }
        
        // Create case deadlines
        if (deadlines && deadlines.length) {
          for (const deadline of deadlines) {
            await CaseDeadline.create({
              caseId: caseInstance.id,
              title: deadline.title,
              date: deadline.date,
              completed: deadline.completed
            });
          }
          console.log(`Added ${deadlines.length} deadlines to case ${caseDetails.caseNumber}`);
        }
      } else {
        console.log(`Case already exists: ${caseDetails.caseNumber}`);
      }
    }
    
  } catch (error) {
    console.error('Error seeding cases:', error);
    throw error;
  }
};

module.exports = seedCases;
