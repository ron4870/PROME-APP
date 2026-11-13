import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function updateAuditRecord() {
  console.log('[Audit Update] Updating Audit ID 1 with Internal Audit Report No. 04 (21st May 2026)...');

  const adminUser = await prisma.user.findFirst();
  const uploaderId = adminUser?.id || 1;

  // 1. Update or upsert Audit ID 1
  const existingAudit = await prisma.audit.findFirst({
    where: { id: 1 }
  });

  const auditData = {
    auditNumber: 'PROME-AUD-2026-001',
    title: 'Internal Audit Report on the PROME IMS - Audit Report No. 04 (PROME-MSR-PMBDD-11)',
    type: 'Internal',
    standard: 'ISO 9001:2015 & ISO 45001:2018',
    scope: 'Engineering Consultancy Services across all departments (PMBDD, CPSD, PDMD, PED, HRAD, FD, SAS) covering people, competence, awareness, legal requirements, context, interested parties, scope, risks, design, quality objectives, customer focus, and HIRA.',
    plannedDate: new Date('2026-05-21T09:00:00.000Z'),
    executionDate: new Date('2026-05-21T18:00:00.000Z'),
    status: 'Completed',
    complianceScore: null,
    summary: 'The audit was conducted successfully, and one non-conformance was identified during the process. The Organisation has established and maintained its management system in line with the required standards. Findings: One (1) Minor Nonconformity (NC-2026-01: Expired OH&S certificates) and Two (2) Opportunities for Improvement (OFI-2026-01: Supplier evaluation forms issuance, OFI-2026-02: Updating Quality Policy on notice board).',
    reportPdfUrl: '/uploads/audit-reports/PROME-IMSR-PMBDD-11_Audit_Report_04.pdf'
  };

  let updatedAudit;
  if (existingAudit) {
    updatedAudit = await prisma.audit.update({
      where: { id: 1 },
      data: auditData
    });
  } else {
    updatedAudit = await prisma.audit.create({
      data: {
        id: 1,
        ...auditData,
        auditorId: uploaderId
      }
    });
  }

  console.log('[Audit Update] Updated Audit record:', updatedAudit.auditNumber, updatedAudit.title);

  // 2. Clear old findings for Audit 1
  await prisma.auditFinding.deleteMany({
    where: { auditId: 1 }
  });

  // 3. Insert the 1 Minor Nonconformity + 2 OFIs
  const findings = [
    {
      findingNumber: 'NC-2026-01',
      auditId: 1,
      clauseRef: 'ISO 45001:2018 Clause 6.1.3 & 9.1.2',
      description: 'The OH&S certificates reviewed during the audit had expired, indicating a lapse in the timely renewal and maintenance of statutory certification requirements.\n\nCorrective Action: Initiated renewal applications with competent statutory authorities; integrated certificate expiration alerts into the IMS automated compliance calendar (60-day and 30-day early warnings); established quarterly statutory compliance evaluation audits.',
      type: 'Minor NC',
      severity: 'Medium',
      status: 'Open'
    },
    {
      findingNumber: 'OFI-2026-01',
      auditId: 1,
      clauseRef: 'ISO 9001:2015 Clause 8.4.1',
      description: 'Supplier evaluation forms had not yet been issued to suppliers at the time of the audit, contrary to the requirements of ISO 9001:2015 Clause 8.4.1 regarding the evaluation and control of external providers.\n\nRecommended Action: Issue supplier performance evaluation questionnaires to all 27 suppliers listed on the 2026 Approved Supplier Master List (PROME-IMSR-TO-31) and institute a formal review cycle every Q4.',
      type: 'OFI',
      severity: 'Low',
      status: 'Open'
    },
    {
      findingNumber: 'OFI-2026-02',
      auditId: 1,
      clauseRef: 'ISO 9001:2015 Clause 7.5 & 5.2',
      description: 'The Quality Policy displayed on the notice board was an outdated 2025 version, indicating inadequate control and updating of documented information in line with the requirements of ISO 9001:2015 Clause 7.5 and ISO 9001:2015 Clause 5.2.\n\nRecommended Action: Immediately replace the outdated 2025 Quality Policy display with the approved 2026 Integrated Management System Policy signed by Managing Director Ronald Kibuuka, and add notice board display verification to monthly IMS inspection checklists.',
      type: 'OFI',
      severity: 'Low',
      status: 'Open'
    }
  ];

  for (const f of findings) {
    await prisma.auditFinding.create({ data: f });
  }

  console.log('[Audit Update] Inserted 1 Minor NC and 2 OFIs.');

  // 4. Update or Create Corporate Library Item
  const libraryTitle = 'Internal Audit Report on the PROME IMS - Audit Report No. 04 (PROME-MSR-PMBDD-11)';
  const libraryDesc = 'Official Integrated Management System (ISO 9001:2015 Quality & ISO 45001:2018 OH&S) Internal Audit Report No. 04 (PROME-MSR-PMBDD-11 Version 00) conducted on 21st May 2026 across all departments. Lead Auditor: Philippa Arinaitwe. Management Representative: Amanya Patience. Status: Generally effective & conforming [Zero Major NCs, 1 Minor NC, 2 OFIs].';
  const libraryTags = 'ISO 9001, ISO 45001, Integrated Audit, Health & Safety, QMS, OH&S, Internal Audit, Compliance, PROME-AUD-2026-001, PROME-MSR-PMBDD-11, Report No. 04';

  let libraryItem: any = null;
  if (updatedAudit.libraryItemId) {
    try {
      libraryItem = await prisma.libraryItem.update({
        where: { id: updatedAudit.libraryItemId },
        data: {
          title: libraryTitle,
          description: libraryDesc,
          category: 'Audit Reports & Compliance',
          version: '4.0',
          fileUrl: '/uploads/audit-reports/PROME-IMSR-PMBDD-11_Audit_Report_04.pdf',
          tags: libraryTags
        }
      });
      console.log('[Audit Update] Updated existing Library Item ID:', libraryItem.id);
    } catch (e) {
      libraryItem = null;
    }
  }

  if (!libraryItem) {
    libraryItem = await prisma.libraryItem.create({
      data: {
        title: libraryTitle,
        description: libraryDesc,
        category: 'Audit Reports & Compliance',
        fileUrl: '/uploads/audit-reports/PROME-IMSR-PMBDD-11_Audit_Report_04.pdf',
        version: '4.0',
        tags: libraryTags,
        uploaderId: uploaderId
      }
    });

    await prisma.audit.update({
      where: { id: updatedAudit.id },
      data: { libraryItemId: libraryItem.id }
    });
    console.log('[Audit Update] Created new Library Item ID:', libraryItem.id);
  }

  console.log('[Audit Update] Audit 1 successfully synchronized with Report No. 04.');
  return { updatedAudit, libraryItem };
}

if (require.main === module) {
  updateAuditRecord()
    .then(() => prisma.$disconnect())
    .catch((e) => {
      console.error(e);
      prisma.$disconnect();
    });
}
