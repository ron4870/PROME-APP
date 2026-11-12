import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument } from 'pdf-lib';

export async function processOrgCharts(): Promise<void> {
  const assetsDir = path.join(__dirname, '../data/assets');
  const serverUploadsDir = path.join(__dirname, '../../uploads/company-documents');
  const publicDocsDir = path.join(process.cwd(), 'public/documents');
  const artifactDir = '/Users/ronaldkibuuka/.gemini/antigravity/brain/75821f4d-03ae-4312-b84e-902ed338afea';

  if (!fs.existsSync(serverUploadsDir)) fs.mkdirSync(serverUploadsDir, { recursive: true });
  if (!fs.existsSync(publicDocsDir)) fs.mkdirSync(publicDocsDir, { recursive: true });

  // 1. Process Company Organisational Chart
  const orgChartRaw = path.join(assetsDir, 'PROME_Company_Organisational_Chart_raw.pdf');
  if (fs.existsSync(orgChartRaw)) {
    const bytes = fs.readFileSync(orgChartRaw);
    const doc = await PDFDocument.load(bytes);
    doc.setTitle('PROME Consultants Limited - Company Organisational Chart');
    doc.setAuthor('PROME Consultants Limited');
    doc.setSubject('Corporate Governance & Reporting Hierarchy (ISO 9001:2015 Clause 5.3)');
    doc.setKeywords(['PROME', 'Company Organisational Chart', 'Org Chart', 'Divisions', 'ISO 9001:2015', '2026']);
    doc.setCreationDate(new Date('2026-01-02T08:00:00Z'));
    doc.setModificationDate(new Date('2026-01-02T08:00:00Z'));

    const outBytes = await doc.save();
    fs.writeFileSync(path.join(serverUploadsDir, 'PROME_Company_Organisational_Chart.pdf'), outBytes);
    fs.writeFileSync(path.join(publicDocsDir, 'PROME_Company_Organisational_Chart.pdf'), outBytes);
    try {
      fs.writeFileSync(path.join(artifactDir, 'PROME_Company_Organisational_Chart.pdf'), outBytes);
    } catch (e) {}
    console.log('[processOrgCharts] Generated PROME_Company_Organisational_Chart.pdf:', outBytes.length, 'bytes');
  }

  // 2. Process IMS Implementation Organisational Structure
  const imsOrgRaw = path.join(assetsDir, 'PROME_IMS_Organisational_Structure_raw.pdf');
  if (fs.existsSync(imsOrgRaw)) {
    const bytes = fs.readFileSync(imsOrgRaw);
    const doc = await PDFDocument.load(bytes);
    doc.setTitle('PROME Consultants Limited - Organizational Structure for IMS Implementation');
    doc.setAuthor('PROME Consultants Limited');
    doc.setSubject('Integrated Management System Governance Structure (ISO 9001:2015 & ISO 45001:2018)');
    doc.setKeywords(['PROME', 'IMS Implementation', 'Safety Committee', 'Internal Auditors', 'ISO 9001', 'ISO 45001', '2026']);
    doc.setCreationDate(new Date('2026-01-02T08:00:00Z'));
    doc.setModificationDate(new Date('2026-01-02T08:00:00Z'));

    const outBytes = await doc.save();
    fs.writeFileSync(path.join(serverUploadsDir, 'PROME_IMS_Organisational_Structure.pdf'), outBytes);
    fs.writeFileSync(path.join(publicDocsDir, 'PROME_IMS_Organisational_Structure.pdf'), outBytes);
    try {
      fs.writeFileSync(path.join(artifactDir, 'PROME_IMS_Organisational_Structure.pdf'), outBytes);
    } catch (e) {}
    console.log('[processOrgCharts] Generated PROME_IMS_Organisational_Structure.pdf:', outBytes.length, 'bytes');
  }
}

if (require.main === module) {
  processOrgCharts()
    .then(() => {
      console.log('Successfully processed both organizational chart documents.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Error processing organizational charts:', err);
      process.exit(1);
    });
}
