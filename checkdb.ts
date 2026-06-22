import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const page = await prisma.bookOfDrawingsPage.findFirst({ where: { canvasState: { not: null } } });
  if (page) {
    console.log("PAGE FOUND:", page.id);
    console.log("CANVAS STATE TYPE:", typeof page.canvasState);
    if (typeof page.canvasState === 'string') {
        console.log("CANVAS STATE PREVIEW:", page.canvasState.substring(0, 300));
    } else {
        console.log("CANVAS STATE KEYS:", Object.keys(page.canvasState));
    }
  } else {
    console.log("NO PAGE FOUND");
  }
}
run().catch(console.error).finally(() => prisma.$disconnect());
