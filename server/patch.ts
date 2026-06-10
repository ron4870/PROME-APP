import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const bids = await prisma.bid.findMany({
    include: { sections: true }
  });

  for (const bid of bids) {
    const hasChecklist = bid.sections.some(s => s.name === "Bid Checklist");
    if (!hasChecklist) {
      await prisma.bidSection.create({
        data: {
          bidId: bid.id,
          name: "Bid Checklist",
          status: "Pending"
        }
      });
      console.log(`Added Bid Checklist to Bid ID: ${bid.id}`);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
