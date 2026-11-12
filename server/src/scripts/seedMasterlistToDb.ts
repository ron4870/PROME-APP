import { PrismaClient } from '@prisma/client';
import { PROME_DOCUMENT_MASTERLIST } from '../data/promeMasterlistSeed';

const prisma = new PrismaClient();

// Legacy mapping to new document number
const LEGACY_MAP: Record<string, string> = {
  'PROME-QSR-AD-13': 'PROME-QSR-HRAD-13',
  'PROME-QSR-AFD-01': 'PROME-QSR-HRAD-12',
  'PROME-QSM-AFD-02': 'PROME-QSR-HRAD-13',
  'PROME-QSP-TO-01/ PROME-QSP-TO-02': 'PROME-QSP-PED-01',
  'PROME-QSP-TO-01': 'PROME-QSP-PED-01',
  'PROME-QSP-TO-02': 'PROME-QSP-PED-01',
  'PROME-QSP-TO-03': 'PROME-QSP-PED-02',
  'PROME-QSP-TO-04': 'PROME-QSP-PED-03',
  'PROME-QSP-BD-01': 'PROME-QSP-PMBDD-01',
  'PROME-QSP-AD-01': 'PROME-QSP-HRAD-01',
  'PROME-QSP-BD-02': 'PROME-QSP-PMBDD-02',
  'PROME-QSP-AP-01': 'PROME-QSP-FIN-01',
  'PROME-QSP-AP-02': 'PROME-QSP-FIN-02',
  'PROME-QSP-TO-05': 'PROME-QSP-PED-04',
  'PROME-QSP-TO-06': 'PROME-QSR-PED-01',
  'PROME-QSP-TO-07': 'PROME-QSR-PED-02',
  'PROME-QSP-TO-08': 'PROME-QSR-PED-03',
  'PROME-QSP-TO-09': 'PROME-QSR-PED-04',
  'PROME-QSP-TO-10': 'PROME-QSR-PED-05',
  'PROME-QSP-TO-11': 'PROME-QSR-PED-06',
  'PROME-QSP-TO-12': 'PROME-QSR-PED-07',
  'PROME-QSP-TO-13': 'PROME-QSR-PED-08',
  'PROME-QSP-TO-14': 'PROME-QSR-PED-09',
  'PROME-QSP-TO-15': 'PROME-QSR-PED-10',
  'PROME-QSP-TO-16': 'PROME-QSR-PED-11',
  'PROME-QSP-TO-17': 'PROME-QSR-PED-12',
  'PROME-QSP-AD-02': 'PROME-QSP-HRAD-02',
  'PROME-QSP-AD-03': 'PROME-QSP-HRAD-03',
  'PROME-QSP-AD-04': 'PROME-QSP-HRAD-04',
  'PROME-QSP-AD-05': 'PROME-QSP-HRAD-05',
  'PROME-QSP-AD-06': 'PROME-QSP-HRAD-06',
  'PROME-QSP-AD-07': 'PROME-QSP-PMBDD-03',
  'PROME-WI-AD-01': 'PROME-WI-HRAD-01',
  'PROME-WI-AD-02': 'PROME-WI-HRAD-02',
  'PROME-WI-TO-01': 'PROME-WI-PED-01',
  'PROME-WI-TO-02': 'PROME-WI-PED-02',
  'PROME-WI-TO-03': 'PROME-WI-PED-03',
  'PROME-WI-TO-04': 'PROME-WI-PED-04',
};

async function syncMasterlist() {
  console.log('Starting masterlist sync with updated 2026 schema...');

  // 1. First, normalize all divisions on any existing MasterDocument
  await prisma.$executeRawUnsafe(`UPDATE "MasterDocument" SET division = 'PED' WHERE division IN ('BE&ED', 'BE & ED', 'BEED')`);
  await prisma.$executeRawUnsafe(`UPDATE "MasterDocument" SET division = 'PMBDD' WHERE division IN ('Business Development', 'BD')`);
  await prisma.$executeRawUnsafe(`UPDATE "MasterDocument" SET division = 'Finance' WHERE division IN ('Accounts and Purchasing', 'Accounts/ Finance', 'Accounts & Purchasing', 'Accounts / Finance')`);
  await prisma.$executeRawUnsafe(`UPDATE "MasterDocument" SET division = 'HR&AD' WHERE division IN ('Administration', 'Admin')`);
  await prisma.$executeRawUnsafe(`UPDATE "MasterDocument" SET division = 'HR&AD / HSE' WHERE division IN ('Administration / HSE', 'Admin / HSE')`);

  // 2. Map legacy document numbers to updated document numbers in the DB
  for (const [legacyDocNum, newDocNum] of Object.entries(LEGACY_MAP)) {
    const existing = await prisma.masterDocument.findUnique({
      where: { documentNumber: legacyDocNum }
    });
    if (existing) {
      // Check if target already exists
      const target = await prisma.masterDocument.findUnique({
        where: { documentNumber: newDocNum }
      });
      if (!target) {
        await prisma.masterDocument.update({
          where: { id: existing.id },
          data: { documentNumber: newDocNum }
        });
        console.log(`Updated legacy code ${legacyDocNum} -> ${newDocNum}`);
      } else {
        // delete obsolete legacy duplicate
        await prisma.masterDocument.delete({ where: { id: existing.id } });
        console.log(`Deleted duplicate legacy code ${legacyDocNum} in favor of ${newDocNum}`);
      }
    }
  }

  // 3. Map legacy Job Descriptions PROME-JD-AD-XX -> PROME-JD-HRAD-XX
  const jdDocs = await prisma.masterDocument.findMany({
    where: {
      documentNumber: { startsWith: 'PROME-JD-AD-' }
    }
  });

  for (const jd of jdDocs) {
    const newDocNum = jd.documentNumber.replace('PROME-JD-AD-', 'PROME-JD-HRAD-');
    const target = await prisma.masterDocument.findUnique({
      where: { documentNumber: newDocNum }
    });
    if (!target) {
      await prisma.masterDocument.update({
        where: { id: jd.id },
        data: { 
          documentNumber: newDocNum,
          division: 'HR&AD'
        }
      });
      console.log(`Updated Job Description ${jd.documentNumber} -> ${newDocNum}`);
    } else {
      await prisma.masterDocument.delete({ where: { id: jd.id } });
    }
  }

  // 4. Upsert all 100 official PROME_DOCUMENT_MASTERLIST items
  let count = 0;
  for (const item of PROME_DOCUMENT_MASTERLIST) {
    await prisma.masterDocument.upsert({
      where: { documentNumber: item.documentNumber },
      update: {
        title: item.title,
        category: item.category,
        division: item.department,
        retentionPeriod: item.retentionPeriod,
        type: item.type,
        revision: item.revision,
        status: item.status || 'Approved',
        fileUrl: item.portalPath?.startsWith('/uploads') ? item.portalPath : undefined,
      },
      create: {
        documentNumber: item.documentNumber,
        title: item.title,
        type: item.type,
        category: item.category,
        division: item.department,
        retentionPeriod: item.retentionPeriod,
        status: item.status || 'Approved',
        revision: item.revision,
        issueDate: item.issueDate ? new Date(item.issueDate) : null,
        fileUrl: item.portalPath?.startsWith('/uploads') ? item.portalPath : null,
      }
    });
    count++;
  }

  console.log(`Successfully synchronized ${count} documents with 2026 masterlist.`);
}

syncMasterlist()
  .catch((err) => {
    console.error('Error syncing masterlist:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
