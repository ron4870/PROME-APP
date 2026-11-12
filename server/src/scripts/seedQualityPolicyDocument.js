const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedQualityPolicyDocument() {
  console.log('[seedQualityPolicyDocument] Starting seed for 2026 Quality Policy...');

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
  console.log(`[seedQualityPolicyDocument] Using user ID ${userId} (${adminUser?.name || 'Default User'})`);

  const docNumber = 'PROME-POL-QOHS-2026';
  const fileUrl = '/uploads/company-documents/PROME_Quality_OHS_Policy_2026.pdf';

  // 2. Upsert in MasterDocument
  const masterDoc = await prisma.masterDocument.upsert({
    where: { documentNumber: docNumber },
    update: {
      title: 'Quality, Occupational Health And Safety Policy',
      type: 'Policy',
      category: 'Quality Manual',
      division: 'ALL',
      retentionPeriod: 'Permanent',
      revision: 'Ver-2026',
      status: 'Approved',
      issueDate: new Date('2026-01-02T08:00:00Z'),
      fileUrl,
      changeHistory: 'Updated official policy statement for 2026 operational year signed by Eng. Ronald Kibuuka, Managing Director (ISO 9001:2015 & ISO 45001:2018). Supersedes 2025 policy.'
    },
    create: {
      documentNumber: docNumber,
      title: 'Quality, Occupational Health And Safety Policy',
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
      changeHistory: 'Updated official policy statement for 2026 operational year signed by Eng. Ronald Kibuuka, Managing Director (ISO 9001:2015 & ISO 45001:2018). Supersedes 2025 policy.'
    }
  });
  console.log(`[seedQualityPolicyDocument] Upserted MasterDocument: ID ${masterDoc.id} (${masterDoc.documentNumber})`);

  // 3. Upsert in LibraryItem
  const libraryTitle = 'Quality, Occupational Health And Safety Policy (2026)';
  const existingLib = await prisma.libraryItem.findFirst({
    where: {
      OR: [
        { title: { contains: 'Quality, Occupational Health And Safety Policy' } },
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
        description: 'Official PROME Consultants Limited Quality, Occupational Health and Safety Policy Statement signed by Eng. R. Kibuuka, Managing Director (ISO 9001:2015 & ISO 45001:2018). Effective January 2026.',
        category: 'Technical Guidelines & Manuals',
        discipline: 'Quality & OHS Management',
        fileUrl,
        version: '2026.1',
        tags: 'Quality Policy, OHS Policy, Health and Safety, ISO 9001, ISO 45001, Policy Statement, Ronald Kibuuka, 2026, IMS, Integrated Management System'
      }
    });
    console.log(`[seedQualityPolicyDocument] Updated LibraryItem: ID ${libItem.id}`);
  } else {
    libItem = await prisma.libraryItem.create({
      data: {
        title: libraryTitle,
        description: 'Official PROME Consultants Limited Quality, Occupational Health and Safety Policy Statement signed by Eng. R. Kibuuka, Managing Director (ISO 9001:2015 & ISO 45001:2018). Effective January 2026.',
        category: 'Technical Guidelines & Manuals',
        discipline: 'Quality & OHS Management',
        fileUrl,
        version: '2026.1',
        uploaderId: userId,
        tags: 'Quality Policy, OHS Policy, Health and Safety, ISO 9001, ISO 45001, Policy Statement, Ronald Kibuuka, 2026, IMS, Integrated Management System'
      }
    });
    console.log(`[seedQualityPolicyDocument] Created LibraryItem: ID ${libItem.id}`);
  }

  // 4. Upsert in IsoDocument
  const isoDoc = await prisma.isoDocument.upsert({
    where: { documentNumber: docNumber },
    update: {
      title: 'Quality, Occupational Health And Safety Policy (2026)',
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
      title: 'Quality, Occupational Health And Safety Policy (2026)',
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
  console.log(`[seedQualityPolicyDocument] Upserted IsoDocument: ID ${isoDoc.id} (${isoDoc.documentNumber})`);

  console.log('[seedQualityPolicyDocument] Successfully seeded 2026 Quality Policy across all tables.');
}

if (require.main === module) {
  seedQualityPolicyDocument()
    .then(() => prisma.$disconnect())
    .catch((err) => {
      console.error('[seedQualityPolicyDocument] Error:', err);
      prisma.$disconnect();
      process.exit(1);
    });
}

module.exports = { seedQualityPolicyDocument };
