const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding 2026 Corporate Planning & Strategy Division (CPSD / CP&SD) Quality Objectives (Version 3.0)...');

  // Find Cyrus Kibuuka (Head of CPSD), Stephanie Canowira, or Ronald Kibuuka
  const cyrus = await prisma.user.findFirst({
    where: { name: { contains: 'Cyrus', mode: 'insensitive' } }
  });
  const stephanie = await prisma.user.findFirst({
    where: { name: { contains: 'Stephanie', mode: 'insensitive' } }
  });
  const ronald = await prisma.user.findFirst({
    where: { name: { contains: 'Ronald', mode: 'insensitive' } }
  });
  const fallbackUser = await prisma.user.findFirst();

  const ownerId = cyrus ? cyrus.id : (stephanie ? stephanie.id : (ronald ? ronald.id : (fallbackUser ? fallbackUser.id : 1)));
  console.log(`Using owner ID: ${ownerId} (${cyrus?.name || stephanie?.name || ronald?.name || 'Admin'})`);

  const cpsdObjectivesData = [
    {
      objectiveNumber: 'PROME-QOBJ-CPSD-11',
      title: 'Innovations, Research & Strategic Commercial Initiatives',
      description: "To spearhead the Company's Innovations, Research and New Strategic Developmental Commercial and Business Initiatives in line with Uganda's vision 2040, the National Development Plans, the National sectoral Plans etc.",
      division: 'CORPORATE PLANNING & STRATEGY DIVISION (CPSD)',
      corporateStrategicObjective: "No. 1 - To ensure that PROME's operations are constantly innovative and agile",
      departmentalQualityObjective: "To spearhead the Company's Innovations, Research and New Strategic Developmental Commercial and Business Initiatives in line with Uganda's vision 2040, the National Development Plans, the National sectoral Plans etc.",
      strategyMethodology: "Liaise with other Division Heads to guide the alignment of Innovations and PROME's strategic growth against relevant National and International Development Plans by generating innovative and actionable ideas in preparation of new opportunities",
      measurementMethod: 'Number of reviewed opportunities/Businesses (horizontal growth)',
      frequencyOfReview: 4,
      kpiTargetPrevious: '5',
      statusPreviousYear: '8',
      kpiTargetCurrent: '5',
      q1Status: '2',
      q2Status: '1',
      q3Status: '2',
      q4Status: '',
      comments: 'Various opportunities have been assessed',
      records: 'Summary spreadsheet showing reviewed opportunities',
      targetValue: 5,
      currentValue: 5,
      unit: 'Opportunities',
      status: 'Achieved',
      departmentHeadApproval: 'Eng. Cyrus Kibuuka',
      departmentHeadDate: '27/10/2026',
      managingDirectorApproval: 'Eng. Ronald Kibuuka',
      managingDirectorDate: '27/10/2026',
      targetDate: new Date('2026-12-31'),
      quarterlyData: {
        originalPdfUrl: '/uploads/quality-objectives/Quality_Objectives_2026-11.pdf',
        code: '2026-11',
        subClause: '1.1'
      }
    },
    {
      objectiveNumber: 'PROME-QOBJ-CPSD-12',
      title: 'Generation of Potential Medium-Term Projects from National Development Plans',
      description: "To generate relevant potential projects in the medium term from Uganda’s vision 2040, the National Development Plans, the National sectoral Plans etc.",
      division: 'CORPORATE PLANNING & STRATEGY DIVISION (CPSD)',
      corporateStrategicObjective: "No. 1 - To ensure that PROME's operations are constantly innovative and agile",
      departmentalQualityObjective: "To generate relevant potential projects in the medium term from Uganda’s vision 2040, the National Development Plans, the National sectoral Plans etc.",
      strategyMethodology: "Analysis of National Development Plans, Vision 2040, Budget for financial year and National Sectoral Plans etc and Recommend viable opportunities (businesses and projects)",
      measurementMethod: 'Number of reviewed opportunities/Businesses (horizontal growth)',
      frequencyOfReview: 4,
      kpiTargetPrevious: '5',
      statusPreviousYear: '8',
      kpiTargetCurrent: '5',
      q1Status: '2',
      q2Status: '1',
      q3Status: '2',
      q4Status: '',
      comments: 'Various opportunities based on National Plans have been assessed',
      records: 'Summary Spreadsheet showing assessed opportunities',
      targetValue: 5,
      currentValue: 5,
      unit: 'Opportunities',
      status: 'Achieved',
      departmentHeadApproval: 'Eng. Cyrus Kibuuka',
      departmentHeadDate: '27/10/2026',
      managingDirectorApproval: 'Eng. Ronald Kibuuka',
      managingDirectorDate: '27/10/2026',
      targetDate: new Date('2026-12-31'),
      quarterlyData: {
        originalPdfUrl: '/uploads/quality-objectives/Quality_Objectives_2026-12.pdf',
        code: '2026-12',
        subClause: '1.2'
      }
    },
    {
      objectiveNumber: 'PROME-QOBJ-CPSD-13',
      title: 'Preparation of Five Year Company Strategic Plan (2026-2030)',
      description: 'To prepare a Five Year Company Strategic Plan for 2026-2030.',
      division: 'CORPORATE PLANNING & STRATEGY DIVISION (CPSD)',
      corporateStrategicObjective: "No. 1 - To ensure that PROME's operations are constantly innovative and agile",
      departmentalQualityObjective: 'To prepare a Five Year Company Strategic Plan for 2026-2030',
      strategyMethodology: 'Liaise with other divisions to prepare strategic plan',
      measurementMethod: 'Approved Five Year Strategic Plan',
      frequencyOfReview: 4,
      kpiTargetPrevious: 'N/A',
      statusPreviousYear: 'N/A',
      kpiTargetCurrent: '100%',
      q1Status: '50%',
      q2Status: '60%',
      q3Status: '75%',
      q4Status: '',
      comments: 'Draft Strategic Plan has been shared with all divisions and is to be reviewed and approved.',
      records: 'Draft Five Year Strategic Plan',
      targetValue: 100,
      currentValue: 75,
      unit: '%',
      status: 'Active',
      departmentHeadApproval: 'Eng. Cyrus Kibuuka',
      departmentHeadDate: '27/10/2026',
      managingDirectorApproval: 'Eng. Ronald Kibuuka',
      managingDirectorDate: '27/10/2026',
      targetDate: new Date('2026-12-31'),
      quarterlyData: {
        originalPdfUrl: '/uploads/quality-objectives/Quality_Objectives_2026-13.pdf',
        code: '2026-13',
        subClause: '1.3'
      }
    },
    {
      objectiveNumber: 'PROME-QOBJ-CPSD-21',
      title: 'Documentation Quality Control Oversight for PMBDD Submissions',
      description: "To maintain oversight management of the ‘Documentation Quality Control’ of the Project Management and Business Development Office.",
      division: 'CORPORATE PLANNING & STRATEGY DIVISION (CPSD)',
      corporateStrategicObjective: 'No. 2 - To meet and exceed Client expectations and satisfaction, even under the most complex of situations',
      departmentalQualityObjective: "To maintain oversight management of the ‘Documentation Quality Control’ of the Project Management and Business Development Office",
      strategyMethodology: 'Review of compliance of PM/BDO with its set guideline on documentation quality control (for each submission made)',
      measurementMethod: 'Percentage of submitted EOIs and Proposals reviewed',
      frequencyOfReview: 4,
      kpiTargetPrevious: '100%',
      statusPreviousYear: '100%',
      kpiTargetCurrent: '100%',
      q1Status: '25%',
      q2Status: '50%',
      q3Status: '75%',
      q4Status: '',
      comments: 'EOIs and Proposals shared with the division have been reviewed',
      records: 'Comments made on each proposal or EOI prior to submission',
      targetValue: 100,
      currentValue: 75,
      unit: '%',
      status: 'Active',
      departmentHeadApproval: 'Eng. Cyrus Kibuuka',
      departmentHeadDate: '27/10/2026',
      managingDirectorApproval: 'Eng. Ronald Kibuuka',
      managingDirectorDate: '27/10/2026',
      targetDate: new Date('2026-12-31'),
      quarterlyData: {
        originalPdfUrl: '/uploads/quality-objectives/Quality_Objectives_2026-21.pdf',
        code: '2026-21',
        subClause: '2.1'
      }
    },
    {
      objectiveNumber: 'PROME-QOBJ-CPSD-22',
      title: 'Oversight on Progress of Ongoing Procurements & Dashboard Reviews',
      description: 'Oversight on progress of ongoing procurements through fortnightly reviews of the procurement dashboard.',
      division: 'CORPORATE PLANNING & STRATEGY DIVISION (CPSD)',
      corporateStrategicObjective: 'No. 2 - To meet and exceed Client expectations and satisfaction, even under the most complex of situations',
      departmentalQualityObjective: 'Oversight on progress of ongoing procurements',
      strategyMethodology: 'Fortnightly review of procurement dashboard',
      measurementMethod: 'Review frequency (number of times)',
      frequencyOfReview: 4,
      kpiTargetPrevious: '100%',
      statusPreviousYear: '100%',
      kpiTargetCurrent: '100%',
      q1Status: '25%',
      q2Status: '50%',
      q3Status: '75%',
      q4Status: '',
      comments: 'Dashboard is reviewed',
      records: 'PMBDO Dashboard',
      targetValue: 100,
      currentValue: 75,
      unit: '%',
      status: 'Active',
      departmentHeadApproval: 'Eng. Cyrus Kibuuka',
      departmentHeadDate: '27/10/2026',
      managingDirectorApproval: 'Eng. Ronald Kibuuka',
      managingDirectorDate: '27/10/2026',
      targetDate: new Date('2026-12-31'),
      quarterlyData: {
        originalPdfUrl: '/uploads/quality-objectives/Quality_Objectives_2026-22.pdf',
        code: '2026-22',
        subClause: '2.2'
      }
    },
    {
      objectiveNumber: 'PROME-QOBJ-CPSD-23',
      title: 'Operational Policies & ISO 9001:2015 Risk Management Oversight',
      description: "To oversee the stringent applications of the Company's operational policies, along with the functional application of the set processes and procedures of each division of the company (all in line with the requirements of ISO 9001:2015 standards) in liaison with the Company's operational Divisions.",
      division: 'CORPORATE PLANNING & STRATEGY DIVISION (CPSD)',
      corporateStrategicObjective: 'No. 2 - To meet and exceed Client expectations and satisfaction, even under the most complex of situations',
      departmentalQualityObjective: "To oversee the stringent applications of the Company's operational policies, along with the functional application of the set processes and procedures of each division of the company (all in line with the requirements of ISO 9001:2015 standards) in liaison with the Company's operational Divisions",
      strategyMethodology: 'Carry out risk assessment based on company processes and procedures and ensure risks are closed out such that client expectations are met',
      measurementMethod: 'Risk matrix review',
      frequencyOfReview: 4,
      kpiTargetPrevious: 'N/A',
      statusPreviousYear: 'N/A',
      kpiTargetCurrent: '1',
      q1Status: '1',
      q2Status: '1',
      q3Status: '1',
      q4Status: '',
      comments: 'Risk Matrix is prepared at start of the year and reviewed continuously',
      records: 'Risk Matrix',
      targetValue: 1,
      currentValue: 1,
      unit: 'Matrix',
      status: 'Active',
      departmentHeadApproval: 'Eng. Cyrus Kibuuka',
      departmentHeadDate: '27/10/2026',
      managingDirectorApproval: 'Eng. Ronald Kibuuka',
      managingDirectorDate: '27/10/2026',
      targetDate: new Date('2026-12-31'),
      quarterlyData: {
        originalPdfUrl: '/uploads/quality-objectives/Quality_Objectives_2026-23.pdf',
        code: '2026-23',
        subClause: '2.3'
      }
    },
    {
      objectiveNumber: 'PROME-QOBJ-CPSD-31',
      title: 'Professional Trainings, Webinars & Competency Development',
      description: 'Ensure attendance of various relevant events, trainings, workshops and conferences subject to availability of funds.',
      division: 'CORPORATE PLANNING & STRATEGY DIVISION (CPSD)',
      corporateStrategicObjective: 'No. 3 - To continuously grow staff competences',
      departmentalQualityObjective: 'Ensure attendance of various relevant events, trainings, workshops and conferences subject to availability of funds',
      strategyMethodology: 'Share events as shared by UACE or UIPE Recommend relevant trainings for individuals',
      measurementMethod: 'Number/Proportion of relevant free webinars attended by staff and trainings attended',
      frequencyOfReview: 4,
      kpiTargetPrevious: '10',
      statusPreviousYear: '10',
      kpiTargetCurrent: '10',
      q1Status: '4',
      q2Status: '3',
      q3Status: '3',
      q4Status: '',
      comments: 'Webinars attended did not issue certificates. Trainings issued certificates',
      records: 'Certificates of attendance of trainings and training reports',
      targetValue: 10,
      currentValue: 10,
      unit: 'Events',
      status: 'Achieved',
      departmentHeadApproval: 'Eng. Cyrus Kibuuka',
      departmentHeadDate: '27/10/2026',
      managingDirectorApproval: 'Eng. Ronald Kibuuka',
      managingDirectorDate: '27/10/2026',
      targetDate: new Date('2026-12-31'),
      quarterlyData: {
        originalPdfUrl: '/uploads/quality-objectives/Quality_Objectives_2026-31.pdf',
        code: '2026-31',
        subClause: '3.1'
      }
    },
    {
      objectiveNumber: 'PROME-QOBJ-CPSD-41',
      title: 'Continual Professional Development (CPD) & Engineering Registration',
      description: 'To encourage continual professional department through CPD trainings and registration with professional institutions.',
      division: 'CORPORATE PLANNING & STRATEGY DIVISION (CPSD)',
      corporateStrategicObjective: 'No. 4 - To institute greater staff professional efficiency, accountability and integrity',
      departmentalQualityObjective: 'To encourage continual professional department',
      strategyMethodology: 'Ensure staff attend CPD trainings and register with professional institutions',
      measurementMethod: 'Number of CPD Attended and number of newly registered professionals',
      frequencyOfReview: 4,
      kpiTargetPrevious: '5',
      statusPreviousYear: '1',
      kpiTargetCurrent: '4',
      q1Status: '0',
      q2Status: '1',
      q3Status: '2',
      q4Status: '',
      comments: 'Engineers previously paid for to attend CPD trainings are being encouraged to register as professional Engineers',
      records: 'List of newly registered Engineers',
      targetValue: 4,
      currentValue: 3,
      unit: 'Professionals',
      status: 'Active',
      departmentHeadApproval: 'Eng. Cyrus Kibuuka',
      departmentHeadDate: '27/10/2026',
      managingDirectorApproval: 'Eng. Ronald Kibuuka',
      managingDirectorDate: '27/10/2026',
      targetDate: new Date('2026-12-31'),
      quarterlyData: {
        originalPdfUrl: '/uploads/quality-objectives/Quality_Objectives_2026-41.pdf',
        code: '2026-41',
        subClause: '4.1'
      }
    },
    {
      objectiveNumber: 'PROME-QOBJ-CPSD-51',
      title: 'Bidding Success & Proposals/EoIs Tracking from Request to Submission',
      description: 'Ensuring the company is successful in bidding for various jobs through fostering good client relations and systematic tracking of all EoIs and RFPs.',
      division: 'CORPORATE PLANNING & STRATEGY DIVISION (CPSD)',
      corporateStrategicObjective: 'No. 5 - To ensure PROME’s sustained corporate profitability and growth',
      departmentalQualityObjective: 'Ensuring the company is successful in bidding for various jobs through fostering good client relations',
      strategyMethodology: 'Tracking of all proposals/EoIs from the time the RFP/EoI request is received to the point of submission.',
      measurementMethod: 'Percentage of Tracked percentage of all EoI/RFP received/submitted',
      frequencyOfReview: 4,
      kpiTargetPrevious: '100%',
      statusPreviousYear: '100%',
      kpiTargetCurrent: '60%',
      q1Status: '25%',
      q2Status: '50%',
      q3Status: '75%',
      q4Status: '',
      comments: 'All bids systematically tracked from request to submission in liaison with PMBDO.',
      records: 'List of submitted EOIs/Proposals indicating successful bids as prepared by PMBDO',
      targetValue: 60,
      currentValue: 75,
      unit: '%',
      status: 'Achieved',
      departmentHeadApproval: 'Eng. Cyrus Kibuuka',
      departmentHeadDate: '27/10/2026',
      managingDirectorApproval: 'Eng. Ronald Kibuuka',
      managingDirectorDate: '27/10/2026',
      targetDate: new Date('2026-12-31'),
      quarterlyData: {
        originalPdfUrl: '/uploads/quality-objectives/Quality_Objectives_2026-51.pdf',
        code: '2026-51',
        subClause: '5.1'
      }
    },
    {
      objectiveNumber: 'PROME-QOBJ-CPSD-52',
      title: 'Departmental Resource Efficiency & Cost Optimization',
      description: 'To ensure efficient use of departmental resources by reducing/cutting out any non-essential expenses considering the COVID-19 pandemic and corporate cost optimization.',
      division: 'CORPORATE PLANNING & STRATEGY DIVISION (CPSD)',
      corporateStrategicObjective: 'No. 5 - To ensure PROME’s sustained corporate profitability and growth',
      departmentalQualityObjective: 'To ensure efficient use of departmental resources by reducing/cutting out any non-essential expenses considering the COVID-19 pandemic',
      strategyMethodology: 'Reduce expenditure',
      measurementMethod: 'Saving of approximately 10% between budget and actual expenditure',
      frequencyOfReview: 2,
      kpiTargetPrevious: '100%',
      statusPreviousYear: '100%',
      kpiTargetCurrent: '100%',
      q1Status: '25%',
      q2Status: '50%',
      q3Status: '75%',
      q4Status: '',
      comments: 'The division is practicing frugality only spending as necessary',
      records: 'Budget performance as prepared by Finance',
      targetValue: 100,
      currentValue: 75,
      unit: '%',
      status: 'Active',
      departmentHeadApproval: 'Eng. Cyrus Kibuuka',
      departmentHeadDate: '27/10/2026',
      managingDirectorApproval: 'Eng. Ronald Kibuuka',
      managingDirectorDate: '27/10/2026',
      targetDate: new Date('2026-12-31'),
      quarterlyData: {
        originalPdfUrl: '/uploads/quality-objectives/Quality_Objectives_2026-52.pdf',
        code: '2026-52',
        subClause: '5.2'
      }
    },
    {
      objectiveNumber: 'PROME-QOBJ-CPSD-61',
      title: 'Institutional Partnerships & Professional Memberships (UACE, UIPE, WB, AfDB)',
      description: 'To market the Company & link PROME with the Uganda Association of Consulting Engineers, the Uganda Institution of Professional Engineers, and other local, regional and international professional bodies.',
      division: 'CORPORATE PLANNING & STRATEGY DIVISION (CPSD)',
      corporateStrategicObjective: 'No. 6 - To continuously improve PROME’s visibility in the profession, in the region and internationally',
      departmentalQualityObjective: 'To market the Company & link PROME with the Uganda Association of Consulting Engineers, the Uganda Institution of Professional Engineers, and the other local, regional and international professional bodies',
      strategyMethodology: 'Maintain membership with relevant institutions',
      measurementMethod: 'Number of relevant professional institutions with which membership is maintained',
      frequencyOfReview: 4,
      kpiTargetPrevious: '5',
      statusPreviousYear: '5',
      kpiTargetCurrent: '5',
      q1Status: '4',
      q2Status: '4',
      q3Status: '4',
      q4Status: '',
      comments: 'PROME has membership with UACE, World Bank, AfDB. Still to make payments to IRF. Also exploring which additional memberships could benefit the company',
      records: 'Membership certificates',
      targetValue: 5,
      currentValue: 4,
      unit: 'Institutions',
      status: 'Active',
      departmentHeadApproval: 'Eng. Cyrus Kibuuka',
      departmentHeadDate: '27/10/2026',
      managingDirectorApproval: 'Eng. Ronald Kibuuka',
      managingDirectorDate: '27/10/2026',
      targetDate: new Date('2026-12-31'),
      quarterlyData: {
        originalPdfUrl: '/uploads/quality-objectives/Quality_Objectives_2026-61.pdf',
        code: '2026-61',
        subClause: '6.1'
      }
    },
    {
      objectiveNumber: 'PROME-QOBJ-CPSD-62',
      title: 'Corporate Digital Presence & Website/Social Media Management',
      description: 'To maintain an online social presence through LinkedIn, website, and digital channels.',
      division: 'CORPORATE PLANNING & STRATEGY DIVISION (CPSD)',
      corporateStrategicObjective: 'No. 6 - To continuously improve PROME’s visibility in the profession, in the region and internationally',
      departmentalQualityObjective: 'To maintain an online social presence',
      strategyMethodology: 'Create and maintain social media accounts on Tiktok and LinkedIn.Update and maintain website by reviewing the content to ensure that the relevant updates are uploaded',
      measurementMethod: 'Updated Social media accounts and updated website',
      frequencyOfReview: 4,
      kpiTargetPrevious: '100%',
      statusPreviousYear: '100%',
      kpiTargetCurrent: '100%',
      q1Status: '25%',
      q2Status: '50%',
      q3Status: '75%',
      q4Status: '',
      comments: 'Tiktok account is yet to be created. Website has been updated. LinkedIn is updated regularly',
      records: 'Social media accounts and Website',
      targetValue: 100,
      currentValue: 75,
      unit: '%',
      status: 'Active',
      departmentHeadApproval: 'Eng. Cyrus Kibuuka',
      departmentHeadDate: '27/10/2026',
      managingDirectorApproval: 'Eng. Ronald Kibuuka',
      managingDirectorDate: '27/10/2026',
      targetDate: new Date('2026-12-31'),
      quarterlyData: {
        originalPdfUrl: '/uploads/quality-objectives/Quality_Objectives_2026-62.pdf',
        code: '2026-62',
        subClause: '6.2'
      }
    },
    {
      objectiveNumber: 'PROME-QOBJ-CPSD-63',
      title: 'Industry Influence & Representation on UACE Council/Committees',
      description: 'To maintain a significant influence in the industry by ensuring adequate representation and participation of PROME on the UACE Council and other relevant organizations.',
      division: 'CORPORATE PLANNING & STRATEGY DIVISION (CPSD)',
      corporateStrategicObjective: 'No. 6 - To continuously improve PROME’s visibility in the profession, in the region and internationally',
      departmentalQualityObjective: 'To maintain a significant influence in the industry',
      strategyMethodology: 'Ensure adequate representation and participation of PROME on the UACE Council and other relevant organizations/ drives',
      measurementMethod: 'Number of PROME staff on UACE council and committees',
      frequencyOfReview: 4,
      kpiTargetPrevious: '100%',
      statusPreviousYear: '100%',
      kpiTargetCurrent: '100%',
      q1Status: '25%',
      q2Status: '50%',
      q3Status: '75%',
      q4Status: '',
      comments: 'PROME is represented on the UACE council and committees and remains critical in the attending and organizing critical sector discussions',
      records: 'List of representatives on various councils and committees',
      targetValue: 100,
      currentValue: 75,
      unit: '%',
      status: 'Active',
      departmentHeadApproval: 'Eng. Cyrus Kibuuka',
      departmentHeadDate: '27/10/2026',
      managingDirectorApproval: 'Eng. Ronald Kibuuka',
      managingDirectorDate: '27/10/2026',
      targetDate: new Date('2026-12-31'),
      quarterlyData: {
        originalPdfUrl: '/uploads/quality-objectives/Quality_Objectives_2026-63.pdf',
        code: '2026-63',
        subClause: '6.3'
      }
    },
    {
      objectiveNumber: 'PROME-QOBJ-CPSD-64',
      title: 'Physical Visibility in the Industry & High-Level Sector Engagements',
      description: 'To maintain a physical visibility in the industry by ensuring attendance of various Engineering related events and trainings.',
      division: 'CORPORATE PLANNING & STRATEGY DIVISION (CPSD)',
      corporateStrategicObjective: 'No. 6 - To continuously improve PROME’s visibility in the profession, in the region and internationally',
      departmentalQualityObjective: 'To maintain a physical visibility in the industry',
      strategyMethodology: 'Ensure attendance of various Engineering related events and trainings',
      measurementMethod: 'Number of public events/trainings attended representing PROME',
      frequencyOfReview: 4,
      kpiTargetPrevious: '5',
      statusPreviousYear: '6',
      kpiTargetCurrent: '5',
      q1Status: '2',
      q2Status: '4',
      q3Status: '6',
      q4Status: '',
      comments: 'PROME representatives attended several engagements and meetings representing PROME including meeting the Minister of Works and Transport',
      records: 'Evidence of attendance of event (certificate if provided)',
      targetValue: 5,
      currentValue: 6,
      unit: 'Events',
      status: 'Achieved',
      departmentHeadApproval: 'Eng. Cyrus Kibuuka',
      departmentHeadDate: '27/10/2026',
      managingDirectorApproval: 'Eng. Ronald Kibuuka',
      managingDirectorDate: '27/10/2026',
      targetDate: new Date('2026-12-31'),
      quarterlyData: {
        originalPdfUrl: '/uploads/quality-objectives/Quality_Objectives_2026-64.pdf',
        code: '2026-64',
        subClause: '6.4'
      }
    }
  ];

  let count = 0;
  for (const objData of cpsdObjectivesData) {
    const existing = await prisma.qualityObjective.findFirst({
      where: {
        OR: [
          { objectiveNumber: objData.objectiveNumber },
          { title: objData.title }
        ]
      }
    });

    if (existing) {
      await prisma.qualityObjective.update({
        where: { id: existing.id },
        data: {
          ...objData,
          ownerId: existing.ownerId || ownerId
        }
      });
      console.log(`Updated CPSD objective: ${objData.objectiveNumber} - ${objData.title}`);
    } else {
      await prisma.qualityObjective.create({
        data: {
          ...objData,
          ownerId
        }
      });
      console.log(`Created CPSD objective: ${objData.objectiveNumber} - ${objData.title}`);
    }
    count++;
  }

  console.log(`Successfully seeded/updated all ${count} CPSD Quality Objectives (Version 3.0)!`);
}

main()
  .catch((e) => {
    console.error('Error seeding CPSD quality objectives:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
