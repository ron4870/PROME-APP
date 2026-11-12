import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { PDFDocument, PDFName, cmyk, StandardFonts } from 'pdf-lib';

export async function generateOhsPolicyPdf(): Promise<string> {
  const possibleSourcePaths = [
    path.join(__dirname, '../data/assets/OHS_Policy__2025.pdf'),
    path.join(__dirname, '../data/assets/Quality_policy__2025.pdf'),
    path.join(__dirname, '../../src/data/assets/OHS_Policy__2025.pdf'),
    path.join(process.cwd(), 'server/src/data/assets/OHS_Policy__2025.pdf'),
    '/Users/ronaldkibuuka/.gemini/antigravity/brain/75821f4d-03ae-4312-b84e-902ed338afea/.user_uploaded/media_1794468839974_675a32b6.pdf',
    '/Users/ronaldkibuuka/.gemini/antigravity/brain/75821f4d-03ae-4312-b84e-902ed338afea/.user_uploaded/media_1794467666677_1a87cc00.pdf'
  ];

  let sourcePath = '';
  for (const p of possibleSourcePaths) {
    if (fs.existsSync(p)) {
      sourcePath = p;
      break;
    }
  }

  if (!sourcePath) {
    throw new Error('OHS policy template PDF not found');
  }

  console.log(`[generateOhsPolicyPdf] Loading source from: ${sourcePath}`);
  const inputBytes = fs.readFileSync(sourcePath);
  const doc = await PDFDocument.load(inputBytes);
  const page = doc.getPage(0);

  // Extract page content stream
  const contents: any = page.node.Contents();
  if (!contents) {
    throw new Error('Could not find Contents stream in policy PDF');
  }

  const rawBytes = contents.asUint8Array ? contents.asUint8Array() : contents.contents;
  const decompressed = zlib.inflateSync(Buffer.from(rawBytes)).toString('latin1');

  // Exact target in the content stream representing "January 2025"
  const targetPattern = /527\.001\s+72\.407\s+Td\s*\r?\n\(January\s*\)Tj\s*\r?\n\/C0_0\s+22\s+Tf\s*\r?\n<0013001100130016>Tj/;

  const modified = decompressed.replace(
    targetPattern,
    '527.001 72.407 Td\n()Tj'
  );

  // Re-encode modified content stream
  const newStream = doc.context.flateStream(modified);
  const newStreamRef = doc.context.register(newStream);
  page.node.set(PDFName.of('Contents'), newStreamRef);

  // Embed font and draw updated 2026 text
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  page.drawText('January 2026', {
    x: 527.001,
    y: 72.407,
    size: 20,
    font,
    color: cmyk(0.199, 1, 1, 0.129) // Official PROME Burgundy Pantone / CMYK
  });

  // Set document metadata
  doc.setTitle('PROME Consultants Limited - Occupational Health And Safety (OHS) Policy (2026)');
  doc.setAuthor('Eng. Ronald Kibuuka - Managing Director');
  doc.setSubject('Occupational Health and Safety Policy Statement (ISO 45001:2018 & ISO 9001:2015)');
  doc.setKeywords(['PROME', 'OHS Policy', 'Occupational Health and Safety', 'ISO 45001', 'ISO 9001', 'Safety Policy', '2026']);
  doc.setCreationDate(new Date('2026-01-02T08:00:00Z'));
  doc.setModificationDate(new Date('2026-01-02T08:00:00Z'));

  const pdfBytes = await doc.save();

  // Define target paths
  const serverUploadsDir = path.join(__dirname, '../../uploads/company-documents');
  const publicDocsDir = path.join(process.cwd(), 'public/documents');
  const artifactDir = '/Users/ronaldkibuuka/.gemini/antigravity/brain/75821f4d-03ae-4312-b84e-902ed338afea';

  if (!fs.existsSync(serverUploadsDir)) {
    fs.mkdirSync(serverUploadsDir, { recursive: true });
  }
  if (!fs.existsSync(publicDocsDir)) {
    fs.mkdirSync(publicDocsDir, { recursive: true });
  }

  const serverOutPath = path.join(serverUploadsDir, 'PROME_OHS_Policy_2026.pdf');
  const publicOutPath = path.join(publicDocsDir, 'PROME_OHS_Policy_2026.pdf');
  const artifactOutPath = path.join(artifactDir, 'PROME_OHS_Policy_2026.pdf');

  fs.writeFileSync(serverOutPath, pdfBytes);
  console.log(`[generateOhsPolicyPdf] Saved to: ${serverOutPath} (${pdfBytes.length} bytes)`);

  fs.writeFileSync(publicOutPath, pdfBytes);
  console.log(`[generateOhsPolicyPdf] Saved to: ${publicOutPath}`);

  try {
    fs.writeFileSync(artifactOutPath, pdfBytes);
    console.log(`[generateOhsPolicyPdf] Saved to artifact: ${artifactOutPath}`);
  } catch (err) {
    console.warn(`[generateOhsPolicyPdf] Could not write to artifact dir:`, err);
  }

  return serverOutPath;
}

if (require.main === module) {
  generateOhsPolicyPdf()
    .then((out) => {
      console.log('Successfully generated 2026 OHS policy PDF:', out);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Failed to generate OHS policy PDF:', err);
      process.exit(1);
    });
}
