import { PrismaClient } from '@prisma/client';
import { getOrCreateBookOfDrawingsFolder } from '../src/services/drive.service';

const prisma = new PrismaClient();

async function main() {
  const roles = [
    { name: 'Administrator', permissions: { admin_panel: true, pmbdd: true, cpsd: true, ped: true, pdmd: true, hrad: true, fd: true } },
    { name: 'Managing Director', permissions: { pmbdd: true, cpsd: true, ped: true, pdmd: true, hrad: true, fd: true } },
    { name: 'Head of Division', permissions: {} },
    { name: 'Staff', permissions: {} },
    { name: 'Employer', permissions: {} },
    { name: 'Contractor', permissions: {} },
    { name: 'Expert', permissions: {} },
    { name: 'Approver', permissions: {} },
    { name: 'Accountant', permissions: { fd: true } },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: {
        name: role.name,
        permissions: role.permissions,
      },
    });
  }

  // Create a default admin user for testing
  const adminRole = await prisma.role.findUnique({ where: { name: 'Administrator' } });
  if (adminRole) {
    await prisma.user.upsert({
      where: {
        email: "admin@promeconsult.com"
      },
      update: {},
      create: {
        email: "admin@promeconsult.com",
        name: "System Admin",
        roles: { connect: [{ id: adminRole.id }] },
      }
    });
  }

  // Create Book of Drawings Template Project if not exists
  const existingTemplate = await prisma.bookOfDrawingsProject.findFirst({
    where: { isTemplate: true }
  });

  if (!existingTemplate) {
    const template = await prisma.bookOfDrawingsProject.create({
      data: {
        name: 'Template Project',
        client: 'Prome Consult',
        description: 'Base template for all Book of Drawings projects. Editing this modifies the default for future projects.',
        isTemplate: true
      }
    });

    const defaultSections = [
      "Page Layout", "Cover Page", "General", "Typical Cross Sections & Pavement Details",
      "Setting-Out Data", "Detailed Plan and Profile", "Cross Sections", "Layout Drawings",
      "Junctions & Intersections", "Utility Services", "Drainage Details", "Structures Details",
      "Geotechnical Works", "Landscaping Works", "Traffic Accomodation", "Engineer's Facilities",
      "Road Signs & Marking", "Ancillary Works", "Final Book"
    ];

    for (const section of defaultSections) {
      await prisma.bookOfDrawingsPage.create({
        data: {
          projectId: template.id,
          section: section,
          pageNumber: 1,
          canvasState: null
        }
      });
    }

    try {
      await getOrCreateBookOfDrawingsFolder(template.id, template.name, null);
    } catch (e) {
      console.error('Failed to create Google Drive folder for Template Project', e);
    }
  }

  // Create Default CV Categories if not exists
  const defaultCategories = [
    "Roads & Highways", "Structures", "Architect", "Electrical & Mechanical", 
    "Materials", "Hydrology", "Survey", "Environment", 
    "Social", "Economist", "Valuer", "Planner"
  ];

  for (const catName of defaultCategories) {
    await prisma.cvCategory.upsert({
      where: { name: catName },
      update: {},
      create: { name: catName }
    });
  }

  // Create CV Template Project if not exists
  const existingCvTemplate = await prisma.cvProject.findFirst({
    where: { isTemplate: true }
  });

  if (!existingCvTemplate) {
    const template = await prisma.cvProject.create({
      data: {
        name: 'Master CV Template',
        client: 'PROME',
        description: 'Base template for all CVs. Editing this modifies the default pages and sections for future CVs.',
        isTemplate: true
      }
    });

    const defaultCvSections = [
      "Page Layout", "Cover Page", "Personal Profile", "Key Qualifications", 
      "Education & Training", "Professional Experience", 
      "Key Project Experience", "Languages", "References", "Final CV Document"
    ];

    for (const section of defaultCvSections) {
      await prisma.cvPage.create({
        data: {
          projectId: template.id,
          section: section,
          pageNumber: 1,
          name: section === 'Page Layout' ? 'Master Frame' : section,
          canvasState: null
        }
      });
    }
  }

  console.log('Seeded default roles and admin user successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
