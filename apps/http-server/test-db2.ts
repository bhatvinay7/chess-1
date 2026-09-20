import { PrismaClient } from "@repo/postgres-db";
const prisma = new PrismaClient();
async function main() {
  const result = await prisma.$queryRaw`
    SELECT enumlabel 
    FROM pg_enum 
    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'GameType');
  `;
  console.log(result);
}
main().finally(() => prisma.$disconnect());
