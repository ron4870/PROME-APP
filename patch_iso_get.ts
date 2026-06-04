import fs from 'fs';

const indexPath = 'server/src/index.ts';
let indexContent = fs.readFileSync(indexPath, 'utf-8');

const routeToAdd = `
// Get single ISO document
app.get('/api/iso-documents/:id', async (req, res) => {
  try {
    const document = await prisma.isoDocument.findUnique({
      where: { id: req.params.id },
      include: {
        author: true,
        approver: true,
      }
    });
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.json(document);
  } catch (error) {
    console.error('Failed to fetch ISO document:', error);
    res.status(500).json({ error: 'Failed to fetch ISO document' });
  }
});
`;

if (!indexContent.includes("app.get('/api/iso-documents/:id',")) {
  indexContent = indexContent.replace(
    "app.get('/api/iso-documents', async (req, res) => {",
    routeToAdd + "\napp.get('/api/iso-documents', async (req, res) => {"
  );
  fs.writeFileSync(indexPath, indexContent);
  console.log("Added GET /api/iso-documents/:id route.");
} else {
  console.log("Route already exists.");
}
