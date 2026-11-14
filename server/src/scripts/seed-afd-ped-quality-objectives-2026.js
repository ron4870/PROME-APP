const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding 2026 AFD & PED Quality Objectives (Version 3.0)...');

  // Find AFD and PED leads
  const hope = await prisma.user.findFirst({
    where: { name: { contains: 'Hope', mode: 'insensitive' } }
  });
  const gertrude = await prisma.user.findFirst({
    where: { name: { contains: 'Gertrude', mode: 'insensitive' } }
  });
  const philippa = await prisma.user.findFirst({
    where: { name: { contains: 'Philippa', mode: 'insensitive' } }
  });
  const simon = await prisma.user.findFirst({
    where: { name: { contains: 'Simon', mode: 'insensitive' } }
  });
  const ronald = await prisma.user.findFirst({
    where: { name: { contains: 'Ronald', mode: 'insensitive' } }
  });
  const fallbackUser = await prisma.user.findFirst();

  const afdOwnerId = hope ? hope.id : (gertrude ? gertrude.id : (ronald ? ronald.id : (fallbackUser ? fallbackUser.id : 1)));
  const pedOwnerId = philippa ? philippa.id : (simon ? simon.id : (ronald ? ronald.id : (fallbackUser ? fallbackUser.id : 1)));

  console.log(`AFD Owner ID: ${afdOwnerId} (${hope?.name || gertrude?.name || 'Admin'})`);
  console.log(`PED Owner ID: ${pedOwnerId} (${philippa?.name || simon?.name || 'Admin'})`);

  const afdObjectivesData = [
    {
      objectiveNumber: 'PROME-QOBJ-AFD-01',
      title: 'Engaging Experienced Project Managers for Complex Infrastructure Projects',
      description: 'Engaging experienced project managers for complex infrastructure projects.',
      division: 'ADMINISTRATION & FINANCE DIVISION (AFD)',
      corporateStrategicObjective: 'No. 1 - To ensure that PROME’s operations are constantly innovative and agile',
      departmentalQualityObjective: 'Engaging experienced project managers for complex infrastructure projects.',
      strategyMethodology: 'Assess project needs and recruiting as per requirement.',
      measurementMethod: 'Number of recruited staff',
      frequencyOfReview: 4,
      kpiTargetPrevious: '4',
      statusPreviousYear: '2',
      kpiTargetCurrent: '4',
      q1Status: '2',
      q2Status: '2',
      q3Status: '0',
      q4Status: '',
      comments: 'Limited number of projects received.',
      records: 'Number of projects stored on MIS',
      targetValue: 4,
      currentValue: 4,
      unit: 'Recruits',
      status: 'Achieved',
      departmentHeadApproval: 'Hope Nahamya',
      departmentHeadDate: '02/09/2026',
      managingDirectorApproval: 'Eng. Ronald Kibuuka',
      managingDirectorDate: '02/09/2026',
      targetDate: new Date('2026-12-31'),
      quarterlyData: {
        originalPdfUrl: '/uploads/quality-objectives/Quality_Objectives_2026_AFD_1.pdf',
        code: '2026-AFD-1',
        subClause: '1.1'
      }
    },
    {
      objectiveNumber: 'PROME-QOBJ-AFD-02',
      title: 'Timely Updating & Review of Required CVs for Client Submissions',
      description: 'Giving ample time to update the required CVs to meet client requirements before submission.',
      division: 'ADMINISTRATION & FINANCE DIVISION (AFD)',
      corporateStrategicObjective: 'No. 2 - To meet and exceed Client expectations and satisfaction, even under the most complex of situations',
      departmentalQualityObjective: 'Giving ample time to update the required CVs to meet client requirements before submission.',
      strategyMethodology: 'Updated CVs to be presented 2 weeks for review before incorporation in bids',
      measurementMethod: 'For every EOI and RFP submitted',
      frequencyOfReview: 4,
      kpiTargetPrevious: '4',
      statusPreviousYear: '2',
      kpiTargetCurrent: '4',
      q1Status: '2',
      q2Status: '2',
      q3Status: '0',
      q4Status: '',
      comments: 'No updated CVs due to limited procurement submissions',
      records: 'Submitted EOIs and RFPs on MIS',
      targetValue: 4,
      currentValue: 4,
      unit: 'Submissions',
      status: 'Achieved',
      departmentHeadApproval: 'Hope Nahamya',
      departmentHeadDate: '02/09/2026',
      managingDirectorApproval: 'Eng. Ronald Kibuuka',
      managingDirectorDate: '02/09/2026',
      targetDate: new Date('2026-12-31'),
      quarterlyData: {
        originalPdfUrl: '/uploads/quality-objectives/Quality_Objectives_2026_AFD_2.pdf',
        code: '2026-AFD-2',
        subClause: '2.1'
      }
    },
    {
      objectiveNumber: 'PROME-QOBJ-AFD-03',
      title: 'Digitalization of Personnel Files on the G-Drive & MIS',
      description: 'Digitalization of personnel files on the G-Drive',
      division: 'ADMINISTRATION & FINANCE DIVISION (AFD)',
      corporateStrategicObjective: 'No. 3 - To continuously grow staff competences',
      departmentalQualityObjective: 'Digitalization of personnel files on the G-Drive',
      strategyMethodology: 'Ensuring files are uploaded quarterly and when necessary',
      measurementMethod: 'Number of files per quarter',
      frequencyOfReview: 4,
      kpiTargetPrevious: '4',
      statusPreviousYear: '4',
      kpiTargetCurrent: '4',
      q1Status: '2',
      q2Status: '2',
      q3Status: '2',
      q4Status: '',
      comments: 'Files continuously digitized and stored',
      records: 'Updated files on MIS',
      targetValue: 4,
      currentValue: 6,
      unit: 'Uploads',
      status: 'Achieved',
      departmentHeadApproval: 'Hope Nahamya',
      departmentHeadDate: '02/09/2026',
      managingDirectorApproval: 'Eng. Ronald Kibuuka',
      managingDirectorDate: '02/09/2026',
      targetDate: new Date('2026-12-31'),
      quarterlyData: {
        originalPdfUrl: '/uploads/quality-objectives/Quality_Objectives_2026_AFD_3.pdf',
        code: '2026-AFD-3',
        subClause: '3.1'
      }
    },
    {
      objectiveNumber: 'PROME-QOBJ-AFD-04',
      title: 'Encouraging Staff Training for Professional Registration and Memberships',
      description: 'Encouraging staff training for professional registration and memberships',
      division: 'ADMINISTRATION & FINANCE DIVISION (AFD)',
      corporateStrategicObjective: 'No. 4 - To institute greater staff professional efficiency, accountability and integrity',
      departmentalQualityObjective: 'Encouraging staff training for professional registration and memberships',
      strategyMethodology: 'Training year planner',
      measurementMethod: 'Staff trained / professional registrations',
      frequencyOfReview: 4,
      kpiTargetPrevious: '4',
      statusPreviousYear: '2',
      kpiTargetCurrent: '2',
      q1Status: '4',
      q2Status: '1',
      q3Status: '2',
      q4Status: '',
      comments: 'Plan was made but encountering limited availability of funds',
      records: 'Annual Training Plan',
      targetValue: 2,
      currentValue: 7,
      unit: 'Trainings',
      status: 'Achieved',
      departmentHeadApproval: 'Hope Nahamya',
      departmentHeadDate: '02/09/2026',
      managingDirectorApproval: 'Eng. Ronald Kibuuka',
      managingDirectorDate: '02/09/2026',
      targetDate: new Date('2026-12-31'),
      quarterlyData: {
        originalPdfUrl: '/uploads/quality-objectives/Quality_Objectives_2026_AFD_4.pdf',
        code: '2026-AFD-4',
        subClause: '4.1'
      }
    },
    {
      objectiveNumber: 'PROME-QOBJ-AFD-05',
      title: 'Coordination of Staff Activities and Fleet Management',
      description: 'Coordination of staff activities and fleet management',
      division: 'ADMINISTRATION & FINANCE DIVISION (AFD)',
      corporateStrategicObjective: 'No. 5 - To ensure PROME’s sustained corporate profitability and growth',
      departmentalQualityObjective: 'Coordination of staff activities',
      strategyMethodology: 'Ensuring proper use of company vehicles through introduction of log books/trackings',
      measurementMethod: 'Number of vehicles being tracked',
      frequencyOfReview: 4,
      kpiTargetPrevious: '100%',
      statusPreviousYear: '100%',
      kpiTargetCurrent: '100%',
      q1Status: '70%',
      q2Status: '70%',
      q3Status: '70%',
      q4Status: '',
      comments: 'Registering of company vehicles',
      records: 'Physical vehicles UAQ 023S, UBL 583N, UA 009BG and UAZ 780P (now disposed off)',
      targetValue: 100,
      currentValue: 70,
      unit: '%',
      status: 'Active',
      departmentHeadApproval: 'Hope Nahamya',
      departmentHeadDate: '02/09/2026',
      managingDirectorApproval: 'Eng. Ronald Kibuuka',
      managingDirectorDate: '02/09/2026',
      targetDate: new Date('2026-12-31'),
      quarterlyData: {
        originalPdfUrl: '/uploads/quality-objectives/Quality_Objectives_2026_AFD_5.pdf',
        code: '2026-AFD-5',
        subClause: '5.1'
      }
    },
    {
      objectiveNumber: 'PROME-QOBJ-AFD-06',
      title: 'Corporate Branding of Company Materials and Cards',
      description: 'Branding of company material',
      division: 'ADMINISTRATION & FINANCE DIVISION (AFD)',
      corporateStrategicObjective: 'No. 6 - To continuously improve PROME’s visibility in the profession, in the region and internationally',
      departmentalQualityObjective: 'Branding of company material',
      strategyMethodology: 'Selection of branding materials including business cards',
      measurementMethod: 'Branded materials',
      frequencyOfReview: 4,
      kpiTargetPrevious: '4',
      statusPreviousYear: '2',
      kpiTargetCurrent: '4',
      q1Status: '2',
      q2Status: '0',
      q3Status: '0',
      q4Status: '',
      comments: 'Initial batch completed in Q1',
      records: 'Branded stationary and corporate cards',
      targetValue: 4,
      currentValue: 2,
      unit: 'Batches',
      status: 'Active',
      departmentHeadApproval: 'Hope Nahamya',
      departmentHeadDate: '02/09/2026',
      managingDirectorApproval: 'Eng. Ronald Kibuuka',
      managingDirectorDate: '02/09/2026',
      targetDate: new Date('2026-12-31'),
      quarterlyData: {
        originalPdfUrl: '/uploads/quality-objectives/Quality_Objectives_2026_AFD_6.pdf',
        code: '2026-AFD-6',
        subClause: '6.1'
      }
    }
  ];

  const pedObjectivesData = [
    {
      objectiveNumber: 'PROME-QOBJ-PED-01',
      title: 'Timely Delivery of Projects Utilizing Changing Technology & Smart Solutions',
      description: 'Timely delivery of projects while utilizing the changing and diverse technology and smart solution',
      division: 'PLANNING & ENGINEERING DIVISION (PED)',
      corporateStrategicObjective: 'No. 1 - To ensure that PROME’s operations are constantly innovative and agile',
      departmentalQualityObjective: 'Timely delivery of projects while utilizing the changing and diverse technology and smart solution',
      strategyMethodology: 'Standardization of reporting methods of work and reporting template (2) Team work',
      measurementMethod: 'Review the reporting methods frequently',
      frequencyOfReview: 6,
      kpiTargetPrevious: '100%',
      statusPreviousYear: '100%',
      kpiTargetCurrent: '100%',
      q1Status: '100%',
      q2Status: '100%',
      q3Status: '100%',
      q4Status: '0',
      comments: 'Standardized reporting templates and teamwork routines consistently maintained',
      records: 'Project progress reports and standardized reporting templates',
      targetValue: 100,
      currentValue: 100,
      unit: '%',
      status: 'Achieved',
      departmentHeadApproval: 'Philippa Arinaitwe',
      departmentHeadDate: '22/10/2026',
      managingDirectorApproval: 'Eng. Ronald Kibuuka',
      managingDirectorDate: '22/10/2026',
      targetDate: new Date('2026-12-31'),
      quarterlyData: {
        originalPdfUrl: '/uploads/quality-objectives/Quality_Objectives_2026_PED_1.pdf',
        code: '2026-PED-1',
        subClause: '1.1'
      }
    },
    {
      objectiveNumber: 'PROME-QOBJ-PED-02',
      title: 'Standardized Generic Approach to Feasibility Study & Design Projects',
      description: 'To ensure a standardized generic approach to Feasibility study and design projects undertaken and ensure compliance in order to satisfy our clients requirements',
      division: 'PLANNING & ENGINEERING DIVISION (PED)',
      corporateStrategicObjective: 'No. 2 - To meet and exceed Client expectations and satisfaction, even under the most complex of situations',
      departmentalQualityObjective: 'To ensure a standardized generic approach to Feasibility study and design projects undertaken and ensure compliance in order to satisfy our clients requirements',
      strategyMethodology: 'Prepare project plan for each project and execute all services as per contract documents',
      measurementMethod: 'Percentage conformance as per checklist for each project',
      frequencyOfReview: 4,
      kpiTargetPrevious: '100%',
      statusPreviousYear: '100%',
      kpiTargetCurrent: '100%',
      q1Status: '100%',
      q2Status: '100%',
      q3Status: '100%',
      q4Status: '0',
      comments: 'Project plans and QA checklists prepared and executed across all ongoing engineering designs',
      records: 'Project plans and QA checklists',
      targetValue: 100,
      currentValue: 100,
      unit: '%',
      status: 'Achieved',
      departmentHeadApproval: 'Philippa Arinaitwe',
      departmentHeadDate: '22/10/2026',
      managingDirectorApproval: 'Eng. Ronald Kibuuka',
      managingDirectorDate: '22/10/2026',
      targetDate: new Date('2026-12-31'),
      quarterlyData: {
        originalPdfUrl: '/uploads/quality-objectives/Quality_Objectives_2026_PED_2.pdf',
        code: '2026-PED-2',
        subClause: '2.1'
      }
    },
    {
      objectiveNumber: 'PROME-QOBJ-PED-04',
      title: 'Divisional Quarterly Performance Reports Preparation & Submission',
      description: 'Divisional Quarterly performance reports prepared',
      division: 'PLANNING & ENGINEERING DIVISION (PED)',
      corporateStrategicObjective: 'No. 4 - To institute greater staff professional efficiency, accountability and integrity',
      departmentalQualityObjective: 'Divisional Quarterly performance reports prepared',
      strategyMethodology: 'Ensure that all assignments assigned on the G drive are complete',
      measurementMethod: 'Number of quarterly performance reports',
      frequencyOfReview: 4,
      kpiTargetPrevious: '4',
      statusPreviousYear: '4',
      kpiTargetCurrent: '4',
      q1Status: '1',
      q2Status: '2',
      q3Status: '3',
      q4Status: '0',
      comments: 'Q1, Q2, and Q3 divisional reports completed and uploaded',
      records: 'Quarterly performance reports on G-Drive',
      targetValue: 4,
      currentValue: 3,
      unit: 'Reports',
      status: 'Active',
      departmentHeadApproval: 'Philippa Arinaitwe',
      departmentHeadDate: '22/10/2026',
      managingDirectorApproval: 'Eng. Ronald Kibuuka',
      managingDirectorDate: '22/10/2026',
      targetDate: new Date('2026-12-31'),
      quarterlyData: {
        originalPdfUrl: '/uploads/quality-objectives/Quality_Objectives_2026_PED_4.pdf',
        code: '2026-PED-4',
        subClause: '4.1'
      }
    },
    {
      objectiveNumber: 'PROME-QOBJ-PED-05',
      title: 'Preparation of Project Budgets Achieving Minimum 20% Net Profit',
      description: 'Preparation of project budgets that make a minimum net profit of 20%',
      division: 'PLANNING & ENGINEERING DIVISION (PED)',
      corporateStrategicObjective: 'No. 5 - To ensure PROME’s sustained corporate profitability and growth',
      departmentalQualityObjective: 'Preparation of project budgets that make a minimum net profit of 20%',
      strategyMethodology: 'Projects budgets to reflect minimum net profits of 20%',
      measurementMethod: 'Percentage of project operational budgets meeting the minimum 15% net profits',
      frequencyOfReview: 6,
      kpiTargetPrevious: '100%',
      statusPreviousYear: '100%',
      kpiTargetCurrent: '100%',
      q1Status: '100%',
      q2Status: '100%',
      q3Status: '100%',
      q4Status: '0',
      comments: 'Operational budgets aligned with minimum profitability guidelines',
      records: 'Approved project operational budgets',
      targetValue: 100,
      currentValue: 100,
      unit: '%',
      status: 'Achieved',
      departmentHeadApproval: 'Philippa Arinaitwe',
      departmentHeadDate: '22/10/2026',
      managingDirectorApproval: 'Eng. Ronald Kibuuka',
      managingDirectorDate: '22/10/2026',
      targetDate: new Date('2026-12-31'),
      quarterlyData: {
        originalPdfUrl: '/uploads/quality-objectives/Quality_Objectives_2026_PED_5.pdf',
        code: '2026-PED-5',
        subClause: '5.1'
      }
    },
    {
      objectiveNumber: 'PROME-QOBJ-PED-06',
      title: 'Simulation of Engineering Designs for Social Media & Newsletter Showcase',
      description: 'Simulation of designs',
      division: 'PLANNING & ENGINEERING DIVISION (PED)',
      corporateStrategicObjective: 'No. 6 - To continuously improve PROME’s visibility in the profession, in the region and internationally',
      departmentalQualityObjective: 'Simulation of designs',
      strategyMethodology: 'Posting the designs onto social media and the news letter',
      measurementMethod: 'Number of designs',
      frequencyOfReview: 4,
      kpiTargetPrevious: '5',
      statusPreviousYear: '5',
      kpiTargetCurrent: '5',
      q1Status: '0',
      q2Status: '1',
      q3Status: '0',
      q4Status: '0',
      comments: '1 3D simulation rendered and published; additional models in preparation',
      records: 'Rendered models and social media / newsletter publications',
      targetValue: 5,
      currentValue: 1,
      unit: 'Designs',
      status: 'Active',
      departmentHeadApproval: 'Philippa Arinaitwe',
      departmentHeadDate: '22/10/2026',
      managingDirectorApproval: 'Eng. Ronald Kibuuka',
      managingDirectorDate: '22/10/2026',
      targetDate: new Date('2026-12-31'),
      quarterlyData: {
        originalPdfUrl: '/uploads/quality-objectives/Quality_Objectives_2026_PED_6.pdf',
        code: '2026-PED-6',
        subClause: '6.1'
      }
    }
  ];

  let afdCount = 0;
  for (const objData of afdObjectivesData) {
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
          ownerId: existing.ownerId || afdOwnerId
        }
      });
      console.log(`Updated AFD objective: ${objData.objectiveNumber} - ${objData.title}`);
    } else {
      await prisma.qualityObjective.create({
        data: {
          ...objData,
          ownerId: afdOwnerId
        }
      });
      console.log(`Created AFD objective: ${objData.objectiveNumber} - ${objData.title}`);
    }
    afdCount++;
  }

  let pedCount = 0;
  for (const objData of pedObjectivesData) {
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
          ownerId: existing.ownerId || pedOwnerId
        }
      });
      console.log(`Updated PED objective: ${objData.objectiveNumber} - ${objData.title}`);
    } else {
      await prisma.qualityObjective.create({
        data: {
          ...objData,
          ownerId: pedOwnerId
        }
      });
      console.log(`Created PED objective: ${objData.objectiveNumber} - ${objData.title}`);
    }
    pedCount++;
  }

  console.log(`Successfully seeded/updated ${afdCount} AFD objectives and ${pedCount} PED objectives!`);
}

main()
  .catch((e) => {
    console.error('Error seeding AFD & PED quality objectives:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
