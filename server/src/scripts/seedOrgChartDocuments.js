const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedOrgChartDocuments() {
  console.log('[seedOrgChartDocuments] Starting seed for Organizational Structure documents...');

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
  console.log(`[seedOrgChartDocuments] Using user ID ${userId} (${adminUser?.name || 'Default User'})`);

  const doc1Number = 'PROME-DOC-ORG-01';
  const doc1FileUrl = '/uploads/company-documents/PROME_Company_Organisational_Chart.pdf';

  const doc2Number = 'PROME-DOC-IMS-ORG-02';
  const doc2FileUrl = '/uploads/company-documents/PROME_IMS_Organisational_Structure.pdf';

  // 2. MasterDocument Upserts
  await prisma.masterDocument.upsert({
    where: { documentNumber: doc1Number },
    update: {
      title: 'Company Organisational Chart',
      type: 'Manual',
      category: 'Quality Manual',
      division: 'ALL',
      retentionPeriod: 'Permanent',
      revision: 'Ver-2026',
      status: 'Approved',
      issueDate: new Date('2026-01-02T08:00:00Z'),
      fileUrl: doc1FileUrl,
      changeHistory: 'Official PROME Consultants Limited Corporate Governance & Reporting Structure (ISO 9001:2015 Clause 5.3): Board of Directors, Managing Director, 5 Operating Divisions, and Project/Support Staff hierarchy.'
    },
    create: {
      documentNumber: doc1Number,
      title: 'Company Organisational Chart',
      type: 'Manual',
      category: 'Quality Manual',
      division: 'ALL',
      retentionPeriod: 'Permanent',
      revision: 'Ver-2026',
      status: 'Approved',
      issueDate: new Date('2026-01-02T08:00:00Z'),
      ownerId: userId,
      approvedById: userId,
      fileUrl: doc1FileUrl,
      changeHistory: 'Official PROME Consultants Limited Corporate Governance & Reporting Structure (ISO 9001:2015 Clause 5.3): Board of Directors, Managing Director, 5 Operating Divisions, and Project/Support Staff hierarchy.'
    }
  });
  console.log(`[seedOrgChartDocuments] Upserted MasterDocument: ${doc1Number}`);

  await prisma.masterDocument.upsert({
    where: { documentNumber: doc2Number },
    update: {
      title: 'Organizational Structure for IMS Implementation (ISO 9001 & ISO 45001)',
      type: 'Procedure',
      category: 'Quality Manual',
      division: 'ALL',
      retentionPeriod: 'Permanent',
      revision: 'Ver-2026',
      status: 'Approved',
      issueDate: new Date('2026-01-02T08:00:00Z'),
      fileUrl: doc2FileUrl,
      changeHistory: 'Official Integrated Management System Implementation Hierarchy (ISO 9001:2015 Clause 5.3 & ISO 45001:2018 Clause 5.3/5.4): Managing Director, IMS Internal Auditors, Management Representative, IMS & Safety Committee, and Designated Safety Control Roles.'
    },
    create: {
      documentNumber: doc2Number,
      title: 'Organizational Structure for IMS Implementation (ISO 9001 & ISO 45001)',
      type: 'Procedure',
      category: 'Quality Manual',
      division: 'ALL',
      retentionPeriod: 'Permanent',
      revision: 'Ver-2026',
      status: 'Approved',
      issueDate: new Date('2026-01-02T08:00:00Z'),
      ownerId: userId,
      approvedById: userId,
      fileUrl: doc2FileUrl,
      changeHistory: 'Official Integrated Management System Implementation Hierarchy (ISO 9001:2015 Clause 5.3 & ISO 45001:2018 Clause 5.3/5.4): Managing Director, IMS Internal Auditors, Management Representative, IMS & Safety Committee, and Designated Safety Control Roles.'
    }
  });
  console.log(`[seedOrgChartDocuments] Upserted MasterDocument: ${doc2Number}`);

  // 3. LibraryItem Upserts
  const existingLib1 = await prisma.libraryItem.findFirst({
    where: { fileUrl: doc1FileUrl }
  });
  if (existingLib1) {
    await prisma.libraryItem.update({
      where: { id: existingLib1.id },
      data: {
        title: 'Company Organisational Chart (2026)',
        description: 'Official PROME Consultants Limited Corporate Governance & Organisational Reporting Structure under ISO 9001:2015 Clause 5.3 (Board of Directors, Managing Director, 5 Operating Divisions, and Specialized Units).',
        category: 'Company Profiles',
        discipline: 'Corporate Governance & Management',
        fileUrl: doc1FileUrl,
        version: '2026.1',
        tags: 'Organizational Chart, Org Chart, Structure, Board of Directors, Managing Director, Godfrey Ssambwa, Cyrus Kibuuka, Ronald Kibuuka, PJ Ludigo, Justine Nakatudde, ISO 9001, 2026'
      }
    });
    console.log(`[seedOrgChartDocuments] Updated LibraryItem: ID ${existingLib1.id}`);
  } else {
    const created1 = await prisma.libraryItem.create({
      data: {
        title: 'Company Organisational Chart (2026)',
        description: 'Official PROME Consultants Limited Corporate Governance & Organisational Reporting Structure under ISO 9001:2015 Clause 5.3 (Board of Directors, Managing Director, 5 Operating Divisions, and Specialized Units).',
        category: 'Company Profiles',
        discipline: 'Corporate Governance & Management',
        fileUrl: doc1FileUrl,
        version: '2026.1',
        uploaderId: userId,
        tags: 'Organizational Chart, Org Chart, Structure, Board of Directors, Managing Director, Godfrey Ssambwa, Cyrus Kibuuka, Ronald Kibuuka, PJ Ludigo, Justine Nakatudde, ISO 9001, 2026'
      }
    });
    console.log(`[seedOrgChartDocuments] Created LibraryItem: ID ${created1.id}`);
  }

  const existingLib2 = await prisma.libraryItem.findFirst({
    where: { fileUrl: doc2FileUrl }
  });
  if (existingLib2) {
    await prisma.libraryItem.update({
      where: { id: existingLib2.id },
      data: {
        title: 'Organizational Structure for IMS Implementation (ISO 9001 & ISO 45001)',
        description: 'Official Integrated Management System Implementation Structure (ISO 9001:2015 & ISO 45001:2018): Managing Director, IMS Internal Auditors, Management Representative, IMS & Safety Committee, Incident Investigator, Emergency Planning, Fire Fighters, Workplace Risk Control, First Aiders.',
        category: 'Technical Guidelines & Manuals',
        discipline: 'Quality & OHS Management',
        fileUrl: doc2FileUrl,
        version: '2026.1',
        tags: 'IMS Structure, Safety Committee, Internal Auditors, Management Representative, ISO 9001, ISO 45001, First Aiders, Fire Fighters, Emergency Planning, HIRA, 2026'
      }
    });
    console.log(`[seedOrgChartDocuments] Updated LibraryItem: ID ${existingLib2.id}`);
  } else {
    const created2 = await prisma.libraryItem.create({
      data: {
        title: 'Organizational Structure for IMS Implementation (ISO 9001 & ISO 45001)',
        description: 'Official Integrated Management System Implementation Structure (ISO 9001:2015 & ISO 45001:2018): Managing Director, IMS Internal Auditors, Management Representative, IMS & Safety Committee, Incident Investigator, Emergency Planning, Fire Fighters, Workplace Risk Control, First Aiders.',
        category: 'Technical Guidelines & Manuals',
        discipline: 'Quality & OHS Management',
        fileUrl: doc2FileUrl,
        version: '2026.1',
        uploaderId: userId,
        tags: 'IMS Structure, Safety Committee, Internal Auditors, Management Representative, ISO 9001, ISO 45001, First Aiders, Fire Fighters, Emergency Planning, HIRA, 2026'
      }
    });
    console.log(`[seedOrgChartDocuments] Created LibraryItem: ID ${created2.id}`);
  }

  // 4. IsoDocument Upserts
  await prisma.isoDocument.upsert({
    where: { documentNumber: doc1Number },
    update: {
      title: 'Company Organisational Chart (2026)',
      category: 'Manual',
      revision: '2026.0',
      status: 'APPROVED',
      format: 'legacy',
      fileUrl: doc1FileUrl,
      effectiveDate: new Date('2026-01-02T08:00:00Z'),
      publishedAt: new Date('2026-01-02T08:00:00Z')
    },
    create: {
      documentNumber: doc1Number,
      title: 'Company Organisational Chart (2026)',
      category: 'Manual',
      revision: '2026.0',
      status: 'APPROVED',
      format: 'legacy',
      fileUrl: doc1FileUrl,
      authorId: userId,
      reviewerId: userId,
      approverId: userId,
      effectiveDate: new Date('2026-01-02T08:00:00Z'),
      publishedAt: new Date('2026-01-02T08:00:00Z')
    }
  });
  console.log(`[seedOrgChartDocuments] Upserted IsoDocument: ${doc1Number}`);

  await prisma.isoDocument.upsert({
    where: { documentNumber: doc2Number },
    update: {
      title: 'Organizational Structure for IMS Implementation (ISO 9001 & ISO 45001)',
      category: 'Procedure',
      revision: '2026.0',
      status: 'APPROVED',
      format: 'legacy',
      fileUrl: doc2FileUrl,
      effectiveDate: new Date('2026-01-02T08:00:00Z'),
      publishedAt: new Date('2026-01-02T08:00:00Z')
    },
    create: {
      documentNumber: doc2Number,
      title: 'Organizational Structure for IMS Implementation (ISO 9001 & ISO 45001)',
      category: 'Procedure',
      revision: '2026.0',
      status: 'APPROVED',
      format: 'legacy',
      fileUrl: doc2FileUrl,
      authorId: userId,
      reviewerId: userId,
      approverId: userId,
      effectiveDate: new Date('2026-01-02T08:00:00Z'),
      publishedAt: new Date('2026-01-02T08:00:00Z')
    }
  });
  console.log(`[seedOrgChartDocuments] Upserted IsoDocument: ${doc2Number}`);

  console.log('[seedOrgChartDocuments] Successfully seeded both organizational structure documents across all tables.');
}

if (require.main === module) {
  seedOrgChartDocuments()
    .then(() => prisma.$disconnect())
    .catch((err) => {
      console.error('[seedOrgChartDocuments] Error:', err);
      prisma.$disconnect();
      process.exit(1);
    });
}

module.exports = { seedOrgChartDocuments };
