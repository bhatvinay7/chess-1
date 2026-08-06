export type TCCategory = "BULLET" | "BLITZ" | "RAPID" | "DAILY";

export interface TimeControlPreset {
  id: string;
  label: string;
  category: TCCategory;
  initialTimeSec: number;
  incrementSec: number;
  daysPerMove?: number;
}

// IDs match the seed script at packages/postgres-db/prisma/seed.ts
export const TIME_CONTROLS: Record<Exclude<TCCategory, "DAILY">, TimeControlPreset[]> = {
  BULLET: [
    { id: "tc-bullet-1-0", label: "1+0", category: "BULLET", initialTimeSec: 60,  incrementSec: 0 },
    { id: "tc-bullet-1-1", label: "1+1", category: "BULLET", initialTimeSec: 60,  incrementSec: 1 },
    { id: "tc-bullet-2-1", label: "2+1", category: "BULLET", initialTimeSec: 120, incrementSec: 1 },
    { id: "tc-bullet-2-0", label: "2+0", category: "BULLET", initialTimeSec: 120, incrementSec: 0 },
  ],
  BLITZ: [
    { id: "tc-blitz-3-0",  label: "3+0", category: "BLITZ", initialTimeSec: 180, incrementSec: 0 },
    { id: "tc-blitz-3-2",  label: "3+2", category: "BLITZ", initialTimeSec: 180, incrementSec: 2 },
    { id: "tc-blitz-5-0",  label: "5+0", category: "BLITZ", initialTimeSec: 300, incrementSec: 0 },
    { id: "tc-blitz-5-3",  label: "5+3", category: "BLITZ", initialTimeSec: 300, incrementSec: 3 },
  ],
  RAPID: [
    { id: "tc-rapid-10-0",  label: "10+0",  category: "RAPID", initialTimeSec: 600,  incrementSec: 0 },
    { id: "tc-rapid-10-5",  label: "10+5",  category: "RAPID", initialTimeSec: 600,  incrementSec: 5 },
    { id: "tc-rapid-15-10", label: "15+10", category: "RAPID", initialTimeSec: 900,  incrementSec: 10 },
    { id: "tc-rapid-30-0",  label: "30+0",  category: "RAPID", initialTimeSec: 1800, incrementSec: 0 },
  ],
};

export const DAILY_CONTROLS: TimeControlPreset[] = [
  { id: "tc-daily-1",  label: "1 day",    category: "DAILY", initialTimeSec: 0, incrementSec: 0, daysPerMove: 1 },
  { id: "tc-daily-2",  label: "2 days",   category: "DAILY", initialTimeSec: 0, incrementSec: 0, daysPerMove: 2 },
  { id: "tc-daily-3",  label: "3 days",   category: "DAILY", initialTimeSec: 0, incrementSec: 0, daysPerMove: 3 },
  { id: "tc-daily-7",  label: "7 days",   category: "DAILY", initialTimeSec: 0, incrementSec: 0, daysPerMove: 7 },
  { id: "tc-daily-14", label: "14 days",  category: "DAILY", initialTimeSec: 0, incrementSec: 0, daysPerMove: 14 },
];

export const TC_CATEGORY_LABELS: Record<Exclude<TCCategory, "DAILY">, string> = {
  BULLET: "Bullet",
  BLITZ: "Blitz",
  RAPID: "Rapid",
};

export const TC_CATEGORY_COLORS: Record<TCCategory, string> = {
  BULLET: "#e85d5d",
  BLITZ: "#f59e0b",
  RAPID: "#3ecf8e",
  DAILY: "#4b9de8",
};

export const ALL_TIME_CONTROLS: TimeControlPreset[] = [
  ...TIME_CONTROLS.BULLET,
  ...TIME_CONTROLS.BLITZ,
  ...TIME_CONTROLS.RAPID,
  ...DAILY_CONTROLS,
];
