const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedOhsPolicyDocument() {
  console.log('[seedOhsPolicyDocument] Starting seed for 2026 OHS Policy...');

  // 1. Locate an admin user for ownership
  const adminUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { contains: 'admin', mode: 'insensitive' } },
        { name: { contains: 'Kibuuka', mode: 'insensitive' } },
        { name: { contains: 'Ronald', mode: 'insensitive' } }
      ]
    }
  }) || await prisma.user.findFirst();

  const userId = adminUser?.id || 1;
  console.log(`[seedOhsPolicyDocument] Using user ID ${userId} (${adminUser?.name || 'Default User'})`);

  const docNumber = 'PROME-POL-OHS-2026';
  const fileUrl = '/uploads/company-documents/PROME_OHS_Policy_2026.pdf';

  // 2. Upsert in MasterDocument
  const masterDoc = await prisma.masterDocument.upsert({
    where: { documentNumber: docNumber },
    update: {
      title: 'Occupational Health And Safety (OHS) Policy',
      type: 'Policy',
      category: 'Quality Manual',
      division: 'ALL',
      retentionPeriod: 'Permanent',
      revision: 'Ver-2026',
      status: 'Approved',
      issueDate: new Date('2026-01-02T08:00:00Z'),
      fileUrl,
      changeHistory: 'Official PROME Occupational Health and Safety (OHS) Policy Statement for 2026 operational year signed by Eng. Ronald Kibuuka, Managing Director (ISO 45001:2018 Clause 5.2). Effective January 2026.'
    },
    create: {
      documentNumber: docNumber,
      title: 'Occupational Health And Safety (OHS) Policy',
      type: 'Policy',
      category: 'Quality Manual',
      division: 'ALL',
      retentionPeriod: 'Permanent',
      revision: 'Ver-2026',
      status: 'Approved',
      issueDate: new Date('2026-01-02T08:00:00Z'),
      ownerId: userId,
      approvedById: userId,
      fileUrl,
      changeHistory: 'Official PROME Occupational Health and Safety (OHS) Policy Statement for 2026 operational year signed by Eng. Ronald Kibuuka, Managing Director (ISO 45001:2018 Clause 5.2). Effective January 2026.'
    }
  });
  console.log(`[seedOhsPolicyDocument] Upserted MasterDocument: ID ${masterDoc.id} (${masterDoc.documentNumber})`);

  // 3. Upsert in LibraryItem
  const libraryTitle = 'Occupational Health And Safety (OHS) Policy (2026)';
  const existingLib = await prisma.libraryItem.findFirst({
    where: {
      OR: [
        { title: { contains: 'Occupational Health And Safety' } },
        { title: { contains: 'OHS Policy' } },
        { fileUrl }
      ]
    }
  });

  let libItem;
  if (existingLib) {
    libItem = await prisma.libraryItem.update({
      where: { id: existingLib.id },
      data: {
        title: libraryTitle,
        description: 'Official PROME Consultants Limited Occupational Health and Safety (OHS) Policy Statement signed by Eng. R. Kibuuka, Managing Director (ISO 45001:2018 & ISO 9001:2015). Effective January 2026.',
        category: 'Technical Guidelines & Manuals',
        discipline: 'Occupational Health & Safety (OHS)',
        fileUrl,
        version: '2026.1',
        tags: 'OHS Policy, Health and Safety Policy, ISO 45001, Safety Policy, Hazard Elimination, Worker Safety, Emergency Preparedness, Ronald Kibuuka, 2026, IMS'
      }
    });
    console.log(`[seedOhsPolicyDocument] Updated LibraryItem: ID ${libItem.id}`);
  } else {
    libItem = await prisma.libraryItem.create({
      data: {
        title: libraryTitle,
        description: 'Official PROME Consultants Limited Occupational Health and Safety (OHS) Policy Statement signed by Eng. R. Kibuuka, Managing Director (ISO 45001:2018 & ISO 9001:2015). Effective January 2026.',
        category: 'Technical Guidelines & Manuals',
        discipline: 'Occupational Health & Safety (OHS)',
        fileUrl,
        version: '2026.1',
        uploaderId: userId,
        tags: 'OHS Policy, Health and Safety Policy, ISO 45001, Safety Policy, Hazard Elimination, Worker Safety, Emergency Preparedness, Ronald Kibuuka, 2026, IMS'
      }
    });
    console.log(`[seedOhsPolicyDocument] Created LibraryItem: ID ${libItem.id}`);
  }

  // 4. Upsert in IsoDocument
  const isoDoc = await prisma.isoDocument.upsert({
    where: { documentNumber: docNumber },
    update: {
      title: 'Occupational Health And Safety Policy (2026)',
      category: 'Policy',
      revision: '2026.0',
      status: 'APPROVED',
      format: 'legacy',
      fileUrl,
      effectiveDate: new Date('2026-01-02T08:00:00Z'),
      publishedAt: new Date('2026-01-02T08:00:00Z')
    },
    create: {
      documentNumber: docNumber,
      title: 'Occupational Health And Safety Policy (2026)',
      category: 'Policy',
      revision: '2026.0',
      status: 'APPROVED',
      format: 'legacy',
      fileUrl,
      authorId: userId,
      reviewerId: userId,
      approverId: userId,
      effectiveDate: new Date('2026-01-02T08:00:00Z'),
      publishedAt: new Date('2026-01-02T08:00:00Z')
    }
  });
  console.log(`[seedOhsPolicyDocument] Upserted IsoDocument: ID ${isoDoc.id} (${isoDoc.documentNumber})`);

  console.log('[seedOhsPolicyDocument] Successfully seeded 2026 OHS Policy across all tables.');
}

if (require.main === module) {
  seedOhsPolicyDocument()
    .then(() => prisma.$disconnect())
    .catch((err) => {
      console.error('[seedOhsPolicyDocument] Error:', err);
      prisma.$disconnect();
      process.exit(1);
    });
}

module.exports = { seedOhsPolicyDocument };
