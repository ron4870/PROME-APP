import { PrismaClient } from '@prisma/client';

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
      where: { email: 'admin@promeconsult.com' },
      update: {},
      create: {
        email: 'admin@promeconsult.com',
        name: 'System Admin',
        roleId: adminRole.id,
      },
    });
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
