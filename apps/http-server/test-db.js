import { PrismaClient } from '@repo/postgres-db';
const prisma = new PrismaClient();
async function main() {
    const result = await prisma.$queryRaw `
    SELECT data_type, udt_name 
    FROM information_schema.columns 
    WHERE table_name = 'Tournament' AND column_name = 'gameType';
  `;
    console.log(result);
}
main().finally(() => prisma.$disconnect());
