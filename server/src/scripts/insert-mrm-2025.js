const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('--- Step 1: Ensure Users exist ---');
  // 1. Musoke Steven
  let steven = await prisma.user.findFirst({ where: { email: 'steven.musoke@promeconsult.com' } });
  if (!steven) {
    steven = await prisma.user.create({
      data: {
        name: 'Musoke Steven',
        email: 'steven.musoke@promeconsult.com',
        division: 'IT'
      }
    });
    console.log('Created Musoke Steven:', steven.id);
  } else {
    console.log('Found Musoke Steven:', steven.id);
  }

  // 2. Kaitesi Samalie
  let samalie = await prisma.user.findFirst({ where: { email: 'samalie.kaitesi@promeconsult.com' } });
  if (!samalie) {
    samalie = await prisma.user.create({
      data: {
        name: 'Kaitesi Samalie',
        email: 'samalie.kaitesi@promeconsult.com',
        division: 'PED'
      }
    });
    console.log('Created Kaitesi Samalie:', samalie.id);
  } else {
    console.log('Found Kaitesi Samalie:', samalie.id);
  }

  // Known users
  const ronald = await prisma.user.findFirst({ where: { email: 'ronald.kibuuka@promeconsult.com' } });
  const patience = await prisma.user.findFirst({ where: { email: 'patienceaman09@gmail.com' } });
  const godfrey = await prisma.user.findFirst({ where: { email: 'gssambwa@promeconsult.com' } });
  const joseph = await prisma.user.findFirst({ where: { email: 'joseph@promeconsult.com' } });
  const philippa = await prisma.user.findFirst({ where: { email: 'philippa@promeconsult.com' } });
  const stephanie = await prisma.user.findFirst({ where: { email: 'stephanie@promeconsult.com' } });
  const elizabeth = await prisma.user.findFirst({ where: { email: 'elizabeth@promeconsult.com' } });
  const jessica = await prisma.user.findFirst({ where: { email: 'jessie.ausio@promeconsult.com' } });
  const kalyango = await prisma.user.findFirst({ where: { email: 'klamart9@gmail.com' } });
  const gertrude = await prisma.user.findFirst({ where: { email: 'trudenaks@gmail.com' } });
  const grace = await prisma.user.findFirst({ where: { email: 'mutesagrace@gmail.com' } });

  const attendeesList = [
    ronald, patience, godfrey, joseph, philippa, stephanie,
    elizabeth, jessica, kalyango, gertrude, grace, steven, samalie
  ].filter(Boolean);

  console.log('Total Attendees:', attendeesList.length);

  const meetingNumber = 'PROME-MR-2025-001';

  const cardOutputs = {
    previousActionsStatus: 'Install a time management clock system to monitor attendance and procure a hybrid generator to ensure continuity of operations during power outages. Status: Pending - Procurement and installation of systems yet to be completed.',
    changesInIssues: 'All reviewed internal and external elements were found to be up to date, relevant, and appropriate, with no major changes required. Minor updates were aligned to current operations. Continue monitoring internal/external developments impacting the IMS.',
    organizationContextScope: 'The IMS scope was verified to be properly documented, current, and reflective of the organization activities. No boundary or scope adjustments required.',
    policyReviewSummary: 'Continue periodic review of the policy and reinforce awareness among staff through sensitization sessions. IMS Policy displayed in the office, included in induction and other awareness training, and communicated to employees.',
    documentManagementStructure: 'Ensure continuous updating and control of documents to prevent use of obsolete versions. Document control system is functioning effectively (Closed).',
    qualityObjectivesSummary: 'Continue tracking performance against targets and adjust objectives where necessary. SMART targets and KPIs are set by all Heads of Departments. Objectives largely achieved with minor gaps remaining (approx. 90% achieved).',
    auditResultsSummary: '1. Update and regularly review the supplier master list to reflect current suppliers and include evaluation status in line with Clause 8.4.1.\n2. Emergency Preparedness Response Improvements: Display internal emergency contacts and site evacuation plan with locations of Assembly points, Fire extinguishers, First Aid stations and escape routes, and acquire an emergency siren.',
    riskSummary: 'Continue reviewing and updating the risk register to reflect emerging issues. Finalized Risks & Opportunities Register with controls integrated into operational planning.',
    monitoringResults: '1. Legal Register reviewed and confirmed current; monitoring of regulatory changes and compliance activities ongoing.\n2. Ensure all equipment is calibrated as scheduled and maintain proper calibration records. Calibration activities scheduled for completion by 28th January 2026.',
    customerFeedbackSummary: 'Maintain customer feedback systems and continue monitoring satisfaction levels. Communication processes are effective with no issues reported (Closed).',
    capaSummary: 'Maintain system for tracking and closing corrective actions. Implement corrective and preventive actions fully as needed. No non-conformities identified during the review period.',
    adequacyOfResources: 'Sustain engagement with top management to ensure adequate resource allocation. Adequate resources are currently being provided (Closed).',
    providerPerformanceSummary: 'Maintain and regularly update the supplier master list and ensure continuous supplier evaluation. Reinforce adherence to procurement procedures and provide guidance where gaps are identified.',
    processPerformanceProductConformitySummary: 'Continue implementation of QA plans and strengthen monitoring controls. Conduct additional capacity-building training to further improve OHS performance.',
    trainingCompetence: 'Continue conducting training and periodically evaluate its effectiveness to ensure competence. Training activities are being implemented and monitored.',
    emergencyPreparedness: 'Emergency scenarios identified (fire, accidents). Conduct regular emergency drills, review and improve emergency response procedures. Fire drill for office staff & visitors conducted successfully.',
    workerConsultationParticipation: 'Worker engagement activities have been implemented. Continue enhancing worker consultation and participation across project teams.',
    continualImprovementSummary: 'Continuous improvement noted and remains a priority. Commission newly procured hybrid generator and continue tracking efficiency improvements.',
    generalNotes: 'Meeting convened at 10:00 a.m. on 05 December 2025. Cyrus Kibuuka (Head CSPD) was absent with apology. Under AOB: A faulty fridge was identified as a potential workplace hazard in the office kitchenette and prioritized for replacement.'
  };

  const cardOrder = [
    'previousActionsStatus',
    'changesInIssues',
    'organizationContextScope',
    'policyReviewSummary',
    'documentManagementStructure',
    'qualityObjectivesSummary',
    'auditResultsSummary',
    'riskSummary',
    'monitoringResults',
    'customerFeedbackSummary',
    'capaSummary',
    'adequacyOfResources',
    'providerPerformanceSummary',
    'processPerformanceProductConformitySummary',
    'trainingCompetence',
    'emergencyPreparedness',
    'workerConsultationParticipation',
    'continualImprovementSummary',
    'generalNotes'
  ];

  console.log('--- Step 2: Upsert Management Review ---');
  const review = await prisma.managementReview.upsert({
    where: { meetingNumber },
    update: {
      scheduledDate: new Date('2025-12-05T10:00:00.000Z'),
      conductedDate: new Date('2025-12-05T10:00:00.000Z'),
      status: 'Conducted',
      chairpersonId: ronald ? ronald.id : 5,
      purpose: 'Top Management convened a Management Review Meeting (MRM) for the Integrated Management System covering the Quality Management System (QMS) and Occupational Health and Safety Management System (OH&S) in accordance with ISO 9001:2015 and ISO 45001:2018. The purpose is to review the performance, adequacy, and effectiveness of the Integrated Management System and to identify opportunities for continual improvement across PROME Consultants.',
      conclusion: 'The Integrated Management System (ISO 9001:2015 and ISO 45001:2018) is performing satisfactorily and remains aligned with the strategic direction of PROME Consultants Ltd. Gaps identified in attendance monitoring, power reliability, equipment calibration, and emergency response have concrete corrective and preventative measures assigned to process owners. Continual improvement remains an active top-management commitment.',
      approvedByName: 'Ronald Kibuuka',
      approvedDate: '2025-12-05',
      generalNotes: 'Meeting convened at 10:00 a.m. on 05 December 2025 chaired by Managing Director Ronald Kibuuka with Management Representative Patience Amanya. Cyrus Kibuuka (Head CSPD) was absent with apology. Under AOB: A faulty fridge was identified as a potential workplace hazard in the office kitchenette and prioritized for replacement.',
      previousActionsStatus: 'Management reviewed actions from the previous meeting and noted concerns regarding staff lateness and frequent power interruptions affecting operations. It was agreed that automation and backup systems are required to improve efficiency. In OHS review: No outstanding previous actions requiring follow-up.',
      changesInIssues: 'An update of internal and external issues relevant to PROME Consultants. Feedback and requirements of relevant interested parties were reviewed and updated accordingly. The organization’s products and services were reassessed to ensure continued alignment with its strategic direction and operational context. No significant internal or external changes affecting the QMS were identified.',
      organizationContextScope: 'The scope of the Integrated Management System was reviewed against current consultancy operations, projects portfolio, and stakeholder requirements under ISO 9001:2015 and ISO 45001:2018.',
      policyReviewSummary: 'The IMS Policy was reviewed, confirmed to remain relevant to the organization’s context, formally approved, displayed in key areas, and understood by employees.',
      documentManagementStructure: 'All IMS documents including procedures, work instructions, and records were reviewed and confirmed to be up to date. The document master list is maintained.',
      qualityObjectivesSummary: 'Departmental objectives and KPIs were reviewed and found to be aligned with organizational goals. Performance is being monitored regularly. In OHS: Approximately 90% of OHS objectives were achieved, demonstrating strong performance.',
      auditResultsSummary: 'Surveillance Audit: All findings from the previous surveillance audit of IMS (ISO 9001:2015 & OHS 45001:2018) were reviewed and confirmed to have been effectively addressed and closed out. The system is functioning as intended.\nInternal Audits: Two internal audits conducted in 2025 were reviewed. No non-conformities were identified and 1 improvement was suggested and implemented in line with Clause 8.4.1.',
      riskSummary: 'The risk and opportunities register was reviewed and confirmed to be maintained and periodically updated across all active engineering projects and operations.',
      monitoringResults: '1. Legal Compliance: Legal and regulatory requirements have been identified, documented, and are being maintained in a legal register. Legal compliance officer engaged to manage compliance issues. Supervisor OHS training proposed.\n2. Maintenance & Calibration: Preventive maintenance activities are being carried out as planned. However, some equipment calibration is pending and requires attention.',
      customerFeedbackSummary: 'Customer feedback mechanisms are in place and functional. No complaints were recorded from clients or interested parties. Customer satisfaction survey results indicate positive performance across all ongoing projects.',
      capaSummary: 'No non-conforming outputs were identified during the review period. No outstanding corrective actions were identified at the time of the review. All OHS incidents were investigated, resulting in noticeable incident reduction.',
      adequacyOfResources: 'Management commitment to resource provision has improved, supporting effective system implementation across engineering design, project supervision, and administrative tools.',
      providerPerformanceSummary: 'Supplier evaluations were conducted and performance deemed satisfactory. However, it was noted that some procurement procedures, particularly supplier nomination, were not consistently followed. Emphasis was placed on maintaining up-to-date supplier records.',
      processPerformanceProductConformitySummary: 'Quality assurance processes are in place and being followed. No non-conforming outputs were identified during the review period. Overall improvement in OHS performance observed across projects and head office, indicating the effectiveness of implemented controls.',
      trainingCompetence: 'Employee appraisals were completed and training needs identified. A training plan has been implemented to address competency gaps. Training for supervisors on OSH requirements is ongoing.',
      emergencyPreparedness: 'Emergency procedures, plans, and first aid equipment are in place, serviced, and available. A fire drill for office staff and visitors was conducted successfully.',
      workerConsultationParticipation: 'A worker opinion survey was conducted, and feedback was discussed and documented, demonstrating active employee engagement in health, safety, and operational matters.',
      continualImprovementSummary: 'No major system gaps identified; however, continuous improvement remains a priority. A new model efficient generator has been procured to support power reliability.',
      decisions: '1. Install a time management clock system to monitor attendance and procure a hybrid generator to ensure continuity of operations during power outages.\n2. Display internal emergency contacts & site evacuation plan and acquire emergency siren.\n3. Complete pending equipment calibration by 28th January 2026.\n4. Replace faulty office fridge to eliminate hazard by 30th April 2026.',
      cardOrder: cardOrder,
      cardOutputs: cardOutputs,
      attendees: {
        set: attendeesList.map(u => ({ id: u.id }))
      }
    },
    create: {
      meetingNumber,
      scheduledDate: new Date('2025-12-05T10:00:00.000Z'),
      conductedDate: new Date('2025-12-05T10:00:00.000Z'),
      status: 'Conducted',
      chairpersonId: ronald ? ronald.id : 5,
      purpose: 'Top Management convened a Management Review Meeting (MRM) for the Integrated Management System covering the Quality Management System (QMS) and Occupational Health and Safety Management System (OH&S) in accordance with ISO 9001:2015 and ISO 45001:2018. The purpose is to review the performance, adequacy, and effectiveness of the Integrated Management System and to identify opportunities for continual improvement across PROME Consultants.',
      conclusion: 'The Integrated Management System (ISO 9001:2015 and ISO 45001:2018) is performing satisfactorily and remains aligned with the strategic direction of PROME Consultants Ltd. Gaps identified in attendance monitoring, power reliability, equipment calibration, and emergency response have concrete corrective and preventative measures assigned to process owners. Continual improvement remains an active top-management commitment.',
      approvedByName: 'Ronald Kibuuka',
      approvedDate: '2025-12-05',
      generalNotes: 'Meeting convened at 10:00 a.m. on 05 December 2025 chaired by Managing Director Ronald Kibuuka with Management Representative Patience Amanya. Cyrus Kibuuka (Head CSPD) was absent with apology. Under AOB: A faulty fridge was identified as a potential workplace hazard in the office kitchenette and prioritized for replacement.',
      previousActionsStatus: 'Management reviewed actions from the previous meeting and noted concerns regarding staff lateness and frequent power interruptions affecting operations. It was agreed that automation and backup systems are required to improve efficiency. In OHS review: No outstanding previous actions requiring follow-up.',
      changesInIssues: 'An update of internal and external issues relevant to PROME Consultants. Feedback and requirements of relevant interested parties were reviewed and updated accordingly. The organization’s products and services were reassessed to ensure continued alignment with its strategic direction and operational context. No significant internal or external changes affecting the QMS were identified.',
      organizationContextScope: 'The scope of the Integrated Management System was reviewed against current consultancy operations, projects portfolio, and stakeholder requirements under ISO 9001:2015 and ISO 45001:2018.',
      policyReviewSummary: 'The IMS Policy was reviewed, confirmed to remain relevant to the organization’s context, formally approved, displayed in key areas, and understood by employees.',
      documentManagementStructure: 'All IMS documents including procedures, work instructions, and records were reviewed and confirmed to be up to date. The document master list is maintained.',
      qualityObjectivesSummary: 'Departmental objectives and KPIs were reviewed and found to be aligned with organizational goals. Performance is being monitored regularly. In OHS: Approximately 90% of OHS objectives were achieved, demonstrating strong performance.',
      auditResultsSummary: 'Surveillance Audit: All findings from the previous surveillance audit of IMS (ISO 9001:2015 & OHS 45001:2018) were reviewed and confirmed to have been effectively addressed and closed out. The system is functioning as intended.\nInternal Audits: Two internal audits conducted in 2025 were reviewed. No non-conformities were identified and 1 improvement was suggested and implemented in line with Clause 8.4.1.',
      riskSummary: 'The risk and opportunities register was reviewed and confirmed to be maintained and periodically updated across all active engineering projects and operations.',
      monitoringResults: '1. Legal Compliance: Legal and regulatory requirements have been identified, documented, and are being maintained in a legal register. Legal compliance officer engaged to manage compliance issues. Supervisor OHS training proposed.\n2. Maintenance & Calibration: Preventive maintenance activities are being carried out as planned. However, some equipment calibration is pending and requires attention.',
      customerFeedbackSummary: 'Customer feedback mechanisms are in place and functional. No complaints were recorded from clients or interested parties. Customer satisfaction survey results indicate positive performance across all ongoing projects.',
      capaSummary: 'No non-conforming outputs were identified during the review period. No outstanding corrective actions were identified at the time of the review. All OHS incidents were investigated, resulting in noticeable incident reduction.',
      adequacyOfResources: 'Management commitment to resource provision has improved, supporting effective system implementation across engineering design, project supervision, and administrative tools.',
      providerPerformanceSummary: 'Supplier evaluations were conducted and performance deemed satisfactory. However, it was noted that some procurement procedures, particularly supplier nomination, were not consistently followed. Emphasis was placed on maintaining up-to-date supplier records.',
      processPerformanceProductConformitySummary: 'Quality assurance processes are in place and being followed. No non-conforming outputs were identified during the review period. Overall improvement in OHS performance observed across projects and head office, indicating the effectiveness of implemented controls.',
      trainingCompetence: 'Employee appraisals were completed and training needs identified. A training plan has been implemented to address competency gaps. Training for supervisors on OSH requirements is ongoing.',
      emergencyPreparedness: 'Emergency procedures, plans, and first aid equipment are in place, serviced, and available. A fire drill for office staff and visitors was conducted successfully.',
      workerConsultationParticipation: 'A worker opinion survey was conducted, and feedback was discussed and documented, demonstrating active employee engagement in health, safety, and operational matters.',
      continualImprovementSummary: 'No major system gaps identified; however, continuous improvement remains a priority. A new model efficient generator has been procured to support power reliability.',
      decisions: '1. Install a time management clock system to monitor attendance and procure a hybrid generator to ensure continuity of operations during power outages.\n2. Display internal emergency contacts & site evacuation plan and acquire emergency siren.\n3. Complete pending equipment calibration by 28th January 2026.\n4. Replace faulty office fridge to eliminate hazard by 30th April 2026.',
      cardOrder: cardOrder,
      cardOutputs: cardOutputs,
      attendees: {
        connect: attendeesList.map(u => ({ id: u.id }))
      }
    }
  });

  console.log('Management Review Upserted ID:', review.id, review.meetingNumber);

  console.log('--- Step 3: Populate Action Items ---');
  await prisma.reviewActionItem.deleteMany({ where: { reviewId: review.id } });

  const actions = [
    {
      description: 'Install a time management clock system to monitor attendance and procure a hybrid generator to ensure continuity of operations during power outages',
      assignedToId: godfrey ? godfrey.id : null,
      dueDate: new Date('2026-03-30'),
      status: 'In Progress',
      sectionKey: 'previousActionsStatus'
    },
    {
      description: 'Emergency Preparedness Response Improvements: Display internal emergency contacts on display, display site evacuation plan (Assembly points, Fire extinguishers, First Aid stations, escape routes), and acquire an emergency siren',
      assignedToId: godfrey ? godfrey.id : null,
      dueDate: new Date('2025-12-10'),
      status: 'Completed',
      sectionKey: 'auditResultsSummary'
    },
    {
      description: 'Update and regularly review the supplier master list to reflect current suppliers and include evaluation status in line with Clause 8.4.1',
      assignedToId: patience ? patience.id : null,
      dueDate: new Date('2025-12-05'),
      status: 'Completed',
      sectionKey: 'auditResultsSummary'
    },
    {
      description: 'Continue periodic review of IMS Policy and reinforce awareness among staff through sensitization sessions',
      assignedToId: patience ? patience.id : null,
      dueDate: new Date('2025-12-05'),
      status: 'Completed',
      sectionKey: 'policyReviewSummary'
    },
    {
      description: 'Ensure continuous updating and control of documents to prevent use of obsolete versions across all departments',
      assignedToId: godfrey ? godfrey.id : null,
      dueDate: new Date('2025-12-05'),
      status: 'Completed',
      sectionKey: 'documentManagementStructure'
    },
    {
      description: 'Continue tracking departmental performance against SMART KPI targets and adjust objectives where necessary',
      assignedToId: godfrey ? godfrey.id : null,
      dueDate: new Date('2025-12-05'),
      status: 'Completed',
      sectionKey: 'qualityObjectivesSummary'
    },
    {
      description: 'Continue reviewing and updating the risk register to reflect emerging project issues and integrate controls into operational planning',
      assignedToId: stephanie ? stephanie.id : null,
      dueDate: new Date('2025-12-05'),
      status: 'Completed',
      sectionKey: 'riskSummary'
    },
    {
      description: 'Ensure all pending equipment is calibrated as scheduled and maintain proper calibration records',
      assignedToId: jessica ? jessica.id : null,
      dueDate: new Date('2026-01-28'),
      status: 'In Progress',
      sectionKey: 'monitoringResults'
    },
    {
      description: 'Track regulatory changes, keep legal register up to date, and conduct supervisor OHS compliance training',
      assignedToId: gertrude ? gertrude.id : null,
      dueDate: new Date('2025-12-05'),
      status: 'Completed',
      sectionKey: 'monitoringResults'
    },
    {
      description: 'Maintain customer feedback mechanisms and continue monitoring client satisfaction levels',
      assignedToId: elizabeth ? elizabeth.id : null,
      dueDate: new Date('2025-12-05'),
      status: 'Completed',
      sectionKey: 'customerFeedbackSummary'
    },
    {
      description: 'Maintain and regularly update the supplier master list, ensure continuous supplier evaluation, and reinforce adherence to procurement procedures',
      assignedToId: grace ? grace.id : null,
      dueDate: new Date('2025-12-05'),
      status: 'Completed',
      sectionKey: 'providerPerformanceSummary'
    },
    {
      description: 'Continue implementation of Quality Assurance plans and strengthen engineering monitoring controls',
      assignedToId: jessica ? jessica.id : null,
      dueDate: new Date('2025-12-05'),
      status: 'Completed',
      sectionKey: 'processPerformanceProductConformitySummary'
    },
    {
      description: 'Continue implementing the annual training plan and evaluate training effectiveness across departments',
      assignedToId: gertrude ? gertrude.id : null,
      dueDate: new Date('2025-12-05'),
      status: 'Completed',
      sectionKey: 'trainingCompetence'
    },
    {
      description: 'Conduct scheduled emergency drills and update first aid / emergency response procedures',
      assignedToId: godfrey ? godfrey.id : null,
      dueDate: new Date('2025-12-05'),
      status: 'Completed',
      sectionKey: 'emergencyPreparedness'
    },
    {
      description: 'Enhance worker consultation, suggestion schemes, and participation in safety and operational planning',
      assignedToId: stephanie ? stephanie.id : null,
      dueDate: new Date('2025-12-05'),
      status: 'Completed',
      sectionKey: 'workerConsultationParticipation'
    },
    {
      description: 'Commission the newly procured hybrid generator and track energy efficiency improvements',
      assignedToId: stephanie ? stephanie.id : null,
      dueDate: new Date('2025-12-05'),
      status: 'Completed',
      sectionKey: 'continualImprovementSummary'
    },
    {
      description: 'Replace the faulty office fridge to eliminate workplace electrical hazard',
      assignedToId: gertrude ? gertrude.id : null,
      dueDate: new Date('2026-04-30'),
      status: 'Open',
      sectionKey: 'generalNotes'
    }
  ];

  for (const item of actions) {
    await prisma.reviewActionItem.create({
      data: {
        reviewId: review.id,
        description: item.description,
        assignedToId: item.assignedToId,
        dueDate: item.dueDate,
        status: item.status,
        sectionKey: item.sectionKey
      }
    });
  }

  console.log('Action items created successfully:', actions.length);
  console.log('--- ALL COMPLETED SUCCESSFULLY! ---');
}

run()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('Error executing seed:', err);
    await prisma.$disconnect();
    process.exit(1);
  });
