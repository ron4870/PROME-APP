import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateAuditRecord() {
  console.log('[Audit Update] Updating Audit ID 1 (PROME-AUD-2026-001) with revised lead auditor findings...');

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
      complianceScore: null, // Removed numerical rating per lead auditor review in favor of evidence-based conclusions
      summary: 'The Integrated Management System internal audit was conducted in accordance with ISO 19011:2018 guidelines and PROME established procedures. Based on the evidence reviewed, PROME\'s Integrated Management System was found to be generally effective and conforming to the applicable requirements of ISO 9001:2015 and ISO 45001:2018. The audit identified Zero (0) Major Nonconformities, One (1) Minor Nonconformity (NC-2026-01: First-Aid Supplies Replenishment Controls), and Two (2) Opportunities for Improvement (OFI-2026-01: Evacuation Map Contacts, OFI-2026-02: Digital Document Management).',
      reportPdfUrl: '/uploads/audit-reports/PROME-AUD-2026-001_Modern_ISO_Audit_Report.pdf'
    }
  });

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
      clauseRef: 'ISO 45001:2018 Clause 8.2',
      description: 'Expired first-aid supplies were found in the primary head office first-aid box during safety inspection. Established emergency preparedness arrangements exist (kits present, designated first aiders appointed); this finding does not indicate a breakdown of the emergency response system, but represents an isolated control lapse in replenishment.\n\nCorrective Action: 1. Immediately dispose of expired supplies and replenish with fresh, certified consumables. 2. Institute a monthly documented First-Aid Box Inspection & Replenishment Checklist assigned to the designated OHS Officer.',
      type: 'Minor NC',
      severity: 'Medium',
      status: 'Open'
    },
    {
      findingNumber: 'OFI-2026-01',
      auditId: 1,
      clauseRef: 'ISO 45001:2018 Clause 8.2',
      description: 'Emergency contact information was not displayed on the process / escape evacuation route maps posted within the building.\n\nRecommended Action: Include relevant emergency contact numbers (Police, Fire Brigade, Medical Emergency, Facilities Manager) on all escape routes to improve access to essential information and facilitate timely communication during emergency situations.',
      type: 'OFI',
      severity: 'Low',
      status: 'Open'
    },
    {
      findingNumber: 'OFI-2026-02',
      auditId: 1,
      clauseRef: 'ISO 9001:2015 Clause 7.5 & 8.1',
      description: 'Excessive reliance on printed documents was identified across operating divisions during daily routines.\n\nRecommended Action: Progressively transition routine paper workflows to the PROME Intranet / IMS portal, introducing digital approvals, and enforcing electronic document distribution in line with ISO 9001:2015 Clause 7.5 and Clause 8.1.',
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
  const libraryTitle = 'Integrated ISO 9001 & ISO 45001 Audit Report No. 04 (PROME-AUD-2026-001 / PROME-IMSR-PMBDD-11)';
  const libraryDesc = 'Official Integrated Management System (ISO 9001:2015 Quality & ISO 45001:2018 OH&S) Internal Audit Report No. 04 (PROME-IMSR-PMBDD-11 Version 00) conducted on 27 October 2026 across all departments. Evidence-Based Audit Result: Generally effective & conforming to ISO 9001:2015 and ISO 45001:2018 [Zero Major NCs, 1 Minor NC, 2 OFIs].';
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
          version: '4.1',
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
        version: '4.1',
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
