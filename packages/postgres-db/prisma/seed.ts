import { PrismaClient } from "../src/index.js";

const prisma = new PrismaClient();

const TIME_CONTROLS = [
  // Bullet
  {
    id: "tc-bullet-1-0",
    category: "BULLET" as const,
    initialTimeSec: 60,
    incrementSec: 0,
    daysPerMove: 0,
    displayName: "1+0",
  },
  {
    id: "tc-bullet-1-1",
    category: "BULLET" as const,
    initialTimeSec: 60,
    incrementSec: 1,
    daysPerMove: 0,
    displayName: "1+1",
  },
  {
    id: "tc-bullet-2-1",
    category: "BULLET" as const,
    initialTimeSec: 120,
    incrementSec: 1,
    daysPerMove: 0,
    displayName: "2+1",
  },
  {
    id: "tc-bullet-2-0",
    category: "BULLET" as const,
    initialTimeSec: 120,
    incrementSec: 0,
    daysPerMove: 0,
    displayName: "2+0",
  },
  // Blitz
  {
    id: "tc-blitz-3-0",
    category: "BLITZ" as const,
    initialTimeSec: 180,
    incrementSec: 0,
    daysPerMove: 0,
    displayName: "3+0",
  },
  {
    id: "tc-blitz-3-2",
    category: "BLITZ" as const,
    initialTimeSec: 180,
    incrementSec: 2,
    daysPerMove: 0,
    displayName: "3+2",
  },
  {
    id: "tc-blitz-5-0",
    category: "BLITZ" as const,
    initialTimeSec: 300,
    incrementSec: 0,
    daysPerMove: 0,
    displayName: "5+0",
  },
  {
    id: "tc-blitz-5-3",
    category: "BLITZ" as const,
    initialTimeSec: 300,
    incrementSec: 3,
    daysPerMove: 0,
    displayName: "5+3",
  },
  // Rapid
  {
    id: "tc-rapid-10-0",
    category: "RAPID" as const,
    initialTimeSec: 600,
    incrementSec: 0,
    daysPerMove: 0,
    displayName: "10+0",
  },
  {
    id: "tc-rapid-10-5",
    category: "RAPID" as const,
    initialTimeSec: 600,
    incrementSec: 5,
    daysPerMove: 0,
    displayName: "10+5",
  },
  {
    id: "tc-rapid-15-10",
    category: "RAPID" as const,
    initialTimeSec: 900,
    incrementSec: 10,
    daysPerMove: 0,
    displayName: "15+10",
  },
  {
    id: "tc-rapid-30-0",
    category: "RAPID" as const,
    initialTimeSec: 1800,
    incrementSec: 0,
    daysPerMove: 0,
    displayName: "30+0",
  },
  // Daily
  {
    id: "tc-daily-1",
    category: "DAILY" as const,
    initialTimeSec: 0,
    incrementSec: 0,
    daysPerMove: 1,
    displayName: "1 day",
  },
  {
    id: "tc-daily-2",
    category: "DAILY" as const,
    initialTimeSec: 0,
    incrementSec: 0,
    daysPerMove: 2,
    displayName: "2 days",
  },
  {
    id: "tc-daily-3",
    category: "DAILY" as const,
    initialTimeSec: 0,
    incrementSec: 0,
    daysPerMove: 3,
    displayName: "3 days",
  },
  {
    id: "tc-daily-7",
    category: "DAILY" as const,
    initialTimeSec: 0,
    incrementSec: 0,
    daysPerMove: 7,
    displayName: "7 days",
  },
  {
    id: "tc-daily-14",
    category: "DAILY" as const,
    initialTimeSec: 0,
    incrementSec: 0,
    daysPerMove: 14,
    displayName: "14 days",
  },
];

async function main() {
  let seeded = 0;
  for (const tc of TIME_CONTROLS) {
    await prisma.timeControl.upsert({
      where: { id: tc.id },
      update: {
        displayName: tc.displayName,
        initialTimeSec: tc.initialTimeSec,
        incrementSec: tc.incrementSec,
        daysPerMove: tc.daysPerMove,
      },
      create: tc,
    });
    seeded++;
  }
  console.log(`✓ Seeded ${seeded} TimeControl records.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
