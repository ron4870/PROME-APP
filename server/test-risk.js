require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const count = await prisma.risk.count();
    console.log('Total Risks:', count);
    if (count > 0) {
      const risk = await prisma.risk.findFirst();
      console.log('First Risk:', risk);
    }
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}
test();
