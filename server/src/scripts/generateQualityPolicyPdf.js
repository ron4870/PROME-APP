const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { PDFDocument, PDFName, cmyk, StandardFonts } = require('pdf-lib');

async function generateQualityPolicyPdf() {
  const possibleSourcePaths = [
    path.join(__dirname, '../data/assets/Quality_policy__2025.pdf'),
    path.join(__dirname, '../../src/data/assets/Quality_policy__2025.pdf'),
    path.join(process.cwd(), 'server/src/data/assets/Quality_policy__2025.pdf'),
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
    throw new Error('Quality policy 2025 template PDF not found');
  }

  console.log(`[generateQualityPolicyPdf] Loading source from: ${sourcePath}`);
  const inputBytes = fs.readFileSync(sourcePath);
  const doc = await PDFDocument.load(inputBytes);
  const page = doc.getPage(0);

  // Extract page content stream
  const contents = page.node.Contents();
  if (!contents) {
    throw new Error('Could not find Contents stream in policy PDF');
  }

  const rawBytes = contents.asUint8Array();
  const decompressed = zlib.inflateSync(Buffer.from(rawBytes)).toString('latin1');

  // Exact target in the content stream representing "January 2025"
  const targetPattern = /527\.001\s+72\.407\s+Td\s*\r?\n\(January\s*\)Tj\s*\r?\n\/C0_0\s+22\s+Tf\s*\r?\n<0013001100130016>Tj/;
  
  if (!targetPattern.test(decompressed)) {
    console.warn('[generateQualityPolicyPdf] Target date pattern not matched via regex, checking string match...');
  }

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
  doc.setTitle('PROME Consultants Limited - Quality, Occupational Health And Safety Policy (2026)');
  doc.setAuthor('Eng. Ronald Kibuuka - Managing Director');
  doc.setSubject('Integrated Management System Policy Statement (ISO 9001:2015 & ISO 45001:2018)');
  doc.setKeywords(['PROME', 'Quality Policy', 'OHS Policy', 'ISO 9001', 'ISO 45001', '2026']);
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

  const serverOutPath = path.join(serverUploadsDir, 'PROME_Quality_OHS_Policy_2026.pdf');
  const publicOutPath = path.join(publicDocsDir, 'PROME_Quality_OHS_Policy_2026.pdf');
  const artifactOutPath = path.join(artifactDir, 'PROME_Quality_OHS_Policy_2026.pdf');

  fs.writeFileSync(serverOutPath, pdfBytes);
  console.log(`[generateQualityPolicyPdf] Saved to: ${serverOutPath} (${pdfBytes.length} bytes)`);

  fs.writeFileSync(publicOutPath, pdfBytes);
  console.log(`[generateQualityPolicyPdf] Saved to: ${publicOutPath}`);

  try {
    fs.writeFileSync(artifactOutPath, pdfBytes);
    console.log(`[generateQualityPolicyPdf] Saved to artifact: ${artifactOutPath}`);
  } catch (err) {
    console.warn(`[generateQualityPolicyPdf] Could not write to artifact dir:`, err);
  }

  return serverOutPath;
}

if (require.main === module) {
  generateQualityPolicyPdf()
    .then((out) => {
      console.log('Successfully generated 2026 policy PDF:', out);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Failed to generate policy PDF:', err);
      process.exit(1);
    });
}

module.exports = { generateQualityPolicyPdf };
