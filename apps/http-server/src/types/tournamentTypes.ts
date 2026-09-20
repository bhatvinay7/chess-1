import { z } from "zod";

// Enums — must match Prisma schema exactly
export const TournamentAccessTypeSchema = z.enum([
  "CLUB",
  "CROSS_CLUB",
  "OPEN",
  "PRIVATE",
]);
export const TournamentTypeSchema = z.enum([
  "CLUB_SWISS",
  "CLUB_ROUND_ROBIN",
  "GLOBAL_SWISS",
  "GLOBAL_ROUND_ROBIN",
  "DAILY",
  "ARENA",
]);
export const TournamentVisibilitySchema = z.enum([
  "PUBLIC",
  "PRIVATE",
  "CLUB_ONLY",
]);
export const TournamentStatusSchema = z.enum([
  "DRAFT",
  "REGISTRATION_OPEN",
  "REGISTRATION_CLOSED",
  "NOT_INITIALIZED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);
export const GameTypeSchema = z.enum(["STANDARD", "CHESS960"]);
export const TieBreakMethodSchema = z.enum([
  "BUCHHOLZ",
  "MEDIAN_BUCHHOLZ",
  "SONNEBORN_BERGER",
  "DIRECT_ENCOUNTER",
  "MOST_WINS",
]);
export const PairingEngineSchema = z.enum(["DUTCH", "BURSTEIN", "ACCELERATED"]);
export const PairingLogicSchema = z.enum(["SCORE_BASED", "RATING_BASED"]);

// Sub-schemas for Type Settings
export const swissSettingsSchema = z.object({
  totalRounds: z
    .number({ error: "totalRounds is required for Swiss tournaments" })
    .int()
    .positive(),
  pairingEngine: PairingEngineSchema.default("DUTCH"),
  preventRepeatPairs: z.boolean().default(true),
  balanceColors: z.boolean().default(true),
  avoidThreeSameColors: z.boolean().default(true),
  allowBye: z.boolean().default(true),
});

export const arenaSettingsSchema = z.object({
  durationMinutes: z
    .number({ error: "durationMinutes is required for Arena tournaments" })
    .int()
    .positive(),
  pairingLogic: PairingLogicSchema,
  berserkEnabled: z.boolean().default(false),
  streakBonusEnabled: z.boolean().default(false),
});

export const dailySettingsSchema = z.object({
  groupSize: z
    .number({ error: "groupSize is required for Daily tournaments" })
    .int()
    .positive(),
  advancePerGroup: z
    .number({ error: "advancePerGroup is required for Daily tournaments" })
    .int()
    .positive(),
  concurrentGamesPerOpponent: z.number().int().positive().default(2),
  daysPerMove: z
    .number({ error: "daysPerMove is required for Daily tournaments" })
    .int()
    .positive(),
  allowVacation: z.boolean().default(true),
  useTieBreaks: z.boolean().default(true),
});

// Base schema definitions
const baseTournamentSchema = z.object({
  name: z.string({ error: "name is required" }).min(1, "name cannot be empty"),
  description: z.string().nullable().optional(),
  accessType: TournamentAccessTypeSchema,
  tournamentType: TournamentTypeSchema,
  visibility: TournamentVisibilitySchema,
  status: TournamentStatusSchema.default("REGISTRATION_OPEN"),
  clubId: z.string().nullable().optional(),
  gameType: GameTypeSchema.default("STANDARD"),
  isRated: z.boolean().default(true),
  inviteOnly: z.boolean().default(false),
  premiumOnly: z.boolean().default(false),
  requiresApproval: z.boolean().default(false),
  autoStartWhenFull: z.boolean().default(false),
  allowVacation: z.boolean().default(false),
  allowLateJoin: z.boolean().default(false),
  useTieBreaks: z.boolean().default(true),
  tieBreakMethod: TieBreakMethodSchema.nullable().optional(),
  minPlayers: z.number().int().positive().nullable().optional(),
  maxPlayers: z.number().int().positive().nullable().optional(),
  minRating: z.number().int().nonnegative().nullable().optional(),
  maxRating: z.number().int().nonnegative().nullable().optional(),
  minGamesPlayed: z.number().int().nonnegative().nullable().optional(),
  // Time fields — stored in TournamentTimeManagement, required on creation
  registrationOpenAt: z.coerce.date(),
  registrationCloseAt: z.coerce.date(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date().nullable().optional(),
  customFen: z.string().nullable().optional(),
  openingName: z.string().nullable().optional(),
  timeControlId: z.string().nullable().optional(),
  invitedClubIds: z.array(z.string()).optional(),

  // Settings objects are optional at base layer, validated via refinement below
  swissSettings: swissSettingsSchema.optional(),
  arenaSettings: arenaSettingsSchema.optional(),
  dailySettings: dailySettingsSchema.optional(),
});

const SWISS_TYPES = [
  "CLUB_SWISS",
  "GLOBAL_SWISS",
  "CLUB_ROUND_ROBIN",
  "GLOBAL_ROUND_ROBIN",
] as const;

// Conditional validation pipeline using superRefine
export const tournamentSchema = baseTournamentSchema.superRefine(
  (data, ctx) => {
    if (
      (SWISS_TYPES as readonly string[]).includes(data.tournamentType) &&
      !data.swissSettings
    ) {
      ctx.addIssue({
        code: "custom",
        message: "swissSettings are required for Swiss/Round-Robin tournaments",
        path: ["swissSettings"],
      });
    }
    if (data.tournamentType === "ARENA" && !data.arenaSettings) {
      ctx.addIssue({
        code: "custom",
        message: "arenaSettings are required when tournamentType is ARENA",
        path: ["arenaSettings"],
      });
    }
    if (data.tournamentType === "DAILY" && !data.dailySettings) {
      ctx.addIssue({
        code: "custom",
        message: "dailySettings are required when tournamentType is DAILY",
        path: ["dailySettings"],
      });
    }

    // Registration close must be 20–45 minutes before the tournament start time.
    // This window ensures the CDC trigger (30-min or 15-min) always fires after
    // registration closes but with enough lead time to set up groups and pairings.
    const startMs = new Date(data.startTime).getTime();
    const closeMs = new Date(data.registrationCloseAt).getTime();
    const gapMin = (startMs - closeMs) / 60_000;

    if (gapMin < 20) {
      ctx.addIssue({
        code: "custom",
        message:
          "Registration must close at least 20 minutes before the start time.",
        path: ["registrationCloseAt"],
      });
    }
    if (gapMin > 45) {
      ctx.addIssue({
        code: "custom",
        message:
          "Registration must close no more than 45 minutes before the start time.",
        path: ["registrationCloseAt"],
      });
    }
  },
);

export type TournamentInput = z.infer<typeof tournamentSchema>;
interface errorType {
  fieldName: string;
  message: string;
}
type ParseTournamentResult =
  | { success: true; data: TournamentInput }
  | { success: false; errors: errorType[] };

export function parseTournamentData(data: unknown): ParseTournamentResult {
  const result = tournamentSchema.safeParse(data as TournamentInput);

  if (!result.success) {
    return {
      success: false,
      errors: result.error.issues.map((issue) => ({
        fieldName: issue.path.join("."),
        message: issue.message,
      })),
    };
  }

  return {
    success: true,
    data: result.data, // Zod ensures this exactly matches TournamentInput
  };
}
