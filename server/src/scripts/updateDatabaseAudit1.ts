import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateAuditRecord() {
  console.log('[Audit Update] Updating Audit ID 1 (PROME-AUD-2026-001)...');

  // Find admin user or auditor
  const adminUser = await prisma.user.findFirst();
  const uploaderId = adminUser?.id || 1;

  // 1. Update Audit ID 1
  const updatedAudit = await prisma.audit.update({
    where: { id: 1 },
    data: {
      title: 'Integrated Management System Internal Audit (ISO 9001:2015 & ISO 45001:2018) - Report No. 04',
      standard: 'ISO 9001:2015 & ISO 45001:2018',
      scope: 'Comprehensive evaluation of Integrated Management System (ISO 9001:2015 & ISO 45001:2018) compliance across all corporate divisions (PMBDD, CPSD, PDMD, PED, HRAD, FD, SAS) covering engineering design, project supervision, support operations, and occupational health & safety.',
      plannedDate: new Date('2026-10-27T09:00:00.000Z'),
      executionDate: new Date('2026-10-27T18:00:00.000Z'),
      status: 'Completed',
      complianceScore: 98,
      summary: 'The Integrated Management System internal audit PROME-AUD-2026-001 (Audit Report No. 04 / Doc Ref: PROME-IMSR-PMBDD-11) was conducted successfully on 27 October 2026 across all departments. The audit verified zero non-conformances, robust leadership commitment, active quality & OHS objectives monitoring, valid calibrations up to 2028, and registered three opportunities for improvement.',
      reportPdfUrl: '/uploads/audit-reports/PROME-AUD-2026-001_Modern_ISO_Audit_Report.pdf'
    }
  });

  console.log('[Audit Update] Updated Audit record:', updatedAudit.auditNumber, updatedAudit.title);

  // 2. Clear old findings for Audit 1
  await prisma.auditFinding.deleteMany({
    where: { auditId: 1 }
  });

  // 3. Insert the 3 official OFIs from the report
  const findings = [
    {
      findingNumber: 'OFI-2026-01',
      auditId: 1,
      clauseRef: 'ISO 45001:2018 Clause 8.2',
      description: 'Emergency contact information was not displayed on the process / escape evacuation maps posted within the head office.\n\nRecommended Action: Include relevant emergency contact numbers (Police, Fire Brigade, Medical Emergency, Facilities Manager) on all escape routes to facilitate timely communication during emergency situations.',
      type: 'OFI',
      severity: 'Low',
      status: 'Open'
    },
    {
      findingNumber: 'OFI-2026-02',
      auditId: 1,
      clauseRef: 'ISO 9001:2015 Clause 7.5 & 8.1',
      description: 'Excessive reliance on printed documents was identified across operating divisions during daily routines.\n\nRecommended Action: Accelerate digital transformation by progressively transitioning routine paper workflows to the PROME Intranet / IMS portal, introducing digital approvals, and enforcing electronic document distribution.',
      type: 'OFI',
      severity: 'Low',
      status: 'Open'
    },
    {
      findingNumber: 'OFI-2026-03',
      auditId: 1,
      clauseRef: 'ISO 45001:2018 Clause 8.2',
      description: 'Expired first-aid supplies were found in the primary first-aid box during workplace safety inspection.\n\nRecommended Action: Institute a monthly inspection and replenishment checklist for all office and site first-aid boxes with clear expiration date tracking.',
      type: 'OFI',
      severity: 'Low',
      status: 'Open'
    }
  ];

  for (const f of findings) {
    await prisma.auditFinding.create({ data: f });
  }

  console.log('[Audit Update] Inserted 3 official Opportunities for Improvement (OFIs).');

  // 4. Update or Create Corporate Library Item
  const libraryTitle = 'Integrated ISO 9001 & ISO 45001 Audit Report No. 04 (PROME-AUD-2026-001 / PROME-IMSR-PMBDD-11)';
  const libraryDesc = 'Official Integrated Management System (ISO 9001:2015 Quality & ISO 45001:2018 OH&S) Internal Audit Report No. 04 (PROME-IMSR-PMBDD-11 Version 00) conducted on 27 October 2026 across all departments. Overall Compliance Rating: 98% [PASSED / ZERO NON-CONFORMANCES].';
  const libraryTags = 'ISO 9001, ISO 45001, Integrated Audit, Health & Safety, QMS, OH&S, Internal Audit, Compliance, PROME-AUD-2026-001, PROME-IMSR-PMBDD-11, Report No. 04';

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
          fileUrl: '/uploads/audit-reports/PROME-AUD-2026-001_Modern_ISO_Audit_Report.pdf',
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
        discipline: 'Project Management',
        version: '4.0',
        fileUrl: '/uploads/audit-reports/PROME-AUD-2026-001_Modern_ISO_Audit_Report.pdf',
        tags: libraryTags,
        uploaderId
      }
    });
    console.log('[Audit Update] Created new Library Item ID:', libraryItem.id);

    await prisma.audit.update({
      where: { id: 1 },
      data: { libraryItemId: libraryItem.id }
    });
  }

  console.log('[Audit Update] Audit ID 1 synchronization complete!');
}

updateAuditRecord()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
