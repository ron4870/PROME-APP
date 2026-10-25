const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding 2026 ISO 9001:2015 Quality Objectives (Version 3.0)...');

  // Find Godfrey Ssambwa or Ronald Kibuuka or first admin
  const godfrey = await prisma.user.findFirst({
    where: { name: { contains: 'Godfrey', mode: 'insensitive' } }
  });
  const ronald = await prisma.user.findFirst({
    where: { name: { contains: 'Ronald', mode: 'insensitive' } }
  });
  const fallbackUser = await prisma.user.findFirst();

  const ownerId = godfrey ? godfrey.id : (ronald ? ronald.id : (fallbackUser ? fallbackUser.id : 1));

  const objectivesData = [
    {
      objectiveNumber: 'PROME-QOBJ-PMBDD-01',
      title: 'Digitization of QMS & MIS Access across Projects',
      description: 'Maintain a functional digitised Company MIS accessible to staff and clients, integrating document control and change management.',
      division: 'PROJECT MANAGEMENT & BUSINESS DEVELOPMENT DIVISION (PMBDD)',
      corporateStrategicObjective: "No. 1 - To ensure that PROME's operations are constantly innovative and agile",
      departmentalQualityObjective: "To facilitate the efficient and effective communication both internally and with Clients through the digitization of the Company's QMS and Project information.",
      strategyMethodology: "Maintain a functional digitised Compnay MIS that is accessible to workers and the Clients.\nIntegrate document control and change management systems.\nLaunch new digital offerings such as digital twins, asset management dashboards, and automation tools.",
      measurementMethod: '% of projects having MIS access',
      frequencyOfReview: 4,
      kpiTargetPrevious: '100%',
      statusPreviousYear: '100%',
      kpiTargetCurrent: '100%',
      q1Status: '100%',
      q2Status: '0%',
      q3Status: '0%',
      q4Status: '0%',
      comments: 'All projects have MIS access. Document control and change management procedures are followed.',
      records: 'MIS Access Log',
      targetValue: 100,
      currentValue: 100,
      unit: '%',
      status: 'Achieved',
      departmentHeadApproval: 'Godfrey Ssambwa',
      departmentHeadDate: '08/04/2026',
      managingDirectorApproval: 'Ronald Kibuuka',
      managingDirectorDate: '08/04/2026',
      targetDate: new Date('2026-12-31')
    },
    {
      objectiveNumber: 'PROME-QOBJ-PMBDD-02',
      title: 'Technical Audits on On-going Projects',
      description: 'Conduct comprehensive technical audits on ongoing engineering projects to enhance quality and extract lessons learned.',
      division: 'PROJECT MANAGEMENT & BUSINESS DEVELOPMENT DIVISION (PMBDD)',
      corporateStrategicObjective: 'No. 2 - To meet and exceed Client expectations and satisfaction, even under the most complex of conditions',
      departmentalQualityObjective: "To enhance the quality of PROME's project management and secure lessons for future project planning",
      strategyMethodology: 'Conduct Technical Audits on-going projects',
      measurementMethod: 'Number of Technical Audits conducted',
      frequencyOfReview: 4,
      kpiTargetPrevious: '3',
      statusPreviousYear: '3',
      kpiTargetCurrent: '2',
      q1Status: '0',
      q2Status: '0',
      q3Status: '0',
      q4Status: '0',
      comments: 'No technical audits have been conducted so far.',
      records: 'Project Technical Audit Reports.',
      targetValue: 2,
      currentValue: 0,
      unit: 'Audits',
      status: 'Active',
      departmentHeadApproval: 'Godfrey Ssambwa',
      departmentHeadDate: '08/04/2026',
      managingDirectorApproval: 'Ronald Kibuuka',
      managingDirectorDate: '08/04/2026',
      targetDate: new Date('2026-12-31')
    },
    {
      objectiveNumber: 'PROME-QOBJ-PMBDD-03',
      title: 'Competence Growth & On-job Training in Procurement/BD',
      description: 'Conduct on-job training for at least 2 staff in procurement and business development while mentoring graduate engineers.',
      division: 'PROJECT MANAGEMENT & BUSINESS DEVELOPMENT DIVISION (PMBDD)',
      corporateStrategicObjective: 'No. 3 - To continuously grow staff competences',
      departmentalQualityObjective: 'To continuously grow staff competences [knowledge & professionalism, work attitude teamwork, and skills talent development]',
      strategyMethodology: 'Conduct on-job training for at least 2No. Staff in procurement/business development and mentoring engineers for registration.\nCollaborate with local and international service providers to transfer knowledge.',
      measurementMethod: 'Number of staff Trained.',
      frequencyOfReview: 4,
      kpiTargetPrevious: '2No.',
      statusPreviousYear: '5No.',
      kpiTargetCurrent: '2No.',
      q1Status: '1',
      q2Status: '0',
      q3Status: '0',
      q4Status: '0',
      comments: '1.No staff trained',
      records: 'Training Reports',
      targetValue: 2,
      currentValue: 1,
      unit: 'Staff',
      status: 'Active',
      departmentHeadApproval: 'Godfrey Ssambwa',
      departmentHeadDate: '08/04/2026',
      managingDirectorApproval: 'Ronald Kibuuka',
      managingDirectorDate: '08/04/2026',
      targetDate: new Date('2026-12-31')
    },
    {
      objectiveNumber: 'PROME-QOBJ-PMBDD-04',
      title: 'Compilation of Quarterly Performance Review Reports',
      description: "Compile and circulate PROME's quarterly performance review reports to facilitate structured monitoring of corporate objectives.",
      division: 'PROJECT MANAGEMENT & BUSINESS DEVELOPMENT DIVISION (PMBDD)',
      corporateStrategicObjective: 'No. 4 - To institute greater staff professional efficiency, accountability and integrity',
      departmentalQualityObjective: "To take the lead in facilitating the regular review of the Company's Performance of its Objectives.",
      strategyMethodology: "Compilation and circulation of PROME's quarterly performance review reports for discussion and record of remedial actions.",
      measurementMethod: 'Number of Quarterly performance review reports compiled',
      frequencyOfReview: 4,
      kpiTargetPrevious: '4',
      statusPreviousYear: '4',
      kpiTargetCurrent: '4',
      q1Status: '1',
      q2Status: '0',
      q3Status: '0',
      q4Status: '0',
      comments: 'Quarterly performance review reports for January to March 2026.',
      records: 'Performance Review Reports.',
      targetValue: 4,
      currentValue: 1,
      unit: 'Reports',
      status: 'Active',
      departmentHeadApproval: 'Godfrey Ssambwa',
      departmentHeadDate: '08/04/2026',
      managingDirectorApproval: 'Ronald Kibuuka',
      managingDirectorDate: '08/04/2026',
      targetDate: new Date('2026-12-31')
    },
    {
      objectiveNumber: 'PROME-QOBJ-PMBDD-05',
      title: 'Business Opportunity Sourcing & Proposals Submission',
      description: 'Source, research, evaluate, and pursue new business opportunities, submit targeted proposals, and follow up actively.',
      division: 'PROJECT MANAGEMENT & BUSINESS DEVELOPMENT DIVISION (PMBDD)',
      corporateStrategicObjective: "No. 5 - To ensure PROME's sustained corporate profitability and growth",
      departmentalQualityObjective: 'To take the lead in Sourcing, researching, evaluating and pursuing business opportunities for the company.',
      strategyMethodology: 'Prepare targeted Proposals.\nContinually follow up submitted bids and revise strategy as necessary\nPartner with experienced oil & gas engineering firms and EPC contractors for large or specialized oil & gas',
      measurementMethod: 'Number of proposals submitted.',
      frequencyOfReview: 4,
      kpiTargetPrevious: '12',
      statusPreviousYear: '14',
      kpiTargetCurrent: '8',
      q1Status: '4',
      q2Status: '1',
      q3Status: '0',
      q4Status: '0',
      comments: '5 No proposals have been submitted to various potential clients. 6No Expressions of interest have also been submitted.',
      records: 'Submission letters for Proposals.',
      targetValue: 8,
      currentValue: 5,
      unit: 'Proposals',
      status: 'Active',
      departmentHeadApproval: 'Godfrey Ssambwa',
      departmentHeadDate: '08/04/2026',
      managingDirectorApproval: 'Ronald Kibuuka',
      managingDirectorDate: '08/04/2026',
      targetDate: new Date('2026-12-31')
    }
  ];

  for (const objData of objectivesData) {
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
      console.log(`Updated objective: ${objData.objectiveNumber} - ${objData.title}`);
    } else {
      await prisma.qualityObjective.create({
        data: {
          ...objData,
          ownerId
        }
      });
      console.log(`Created objective: ${objData.objectiveNumber} - ${objData.title}`);
    }
  }

  console.log('Successfully seeded all 5 PMBDD Quality Objectives (Version 3.0)!');
}

main()
  .catch((e) => {
    console.error('Error seeding quality objectives:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
