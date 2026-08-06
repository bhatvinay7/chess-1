-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('WAITING', 'ACTIVE', 'DRAW', 'WHITE_WIN', 'BLACK_WIN', 'ABANDONED');

-- CreateEnum
CREATE TYPE "GameResult" AS ENUM ('WIN', 'LOSS', 'DRAW');

-- CreateEnum
CREATE TYPE "TournamentAccessType" AS ENUM ('CLUB', 'CROSS_CLUB', 'OPEN', 'PRIVATE');

-- CreateEnum
CREATE TYPE "TournamentType" AS ENUM ('CLUB_SWISS', 'CLUB_ROUND_ROBIN', 'GLOBAL_SWISS', 'GLOBAL_ROUND_ROBIN', 'DAILY', 'ARENA');

-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('DRAFT', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'NOT_INITIALIZED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TournamentVisibility" AS ENUM ('PUBLIC', 'PRIVATE', 'CLUB_ONLY');

-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('NOT_INITIALIZED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'DRAW', 'ABANDONED');

-- CreateEnum
CREATE TYPE "ResultType" AS ENUM ('WHITE_WIN', 'BLACK_WIN', 'DRAW', 'BYE');

-- CreateEnum
CREATE TYPE "TournamentRole" AS ENUM ('PLAYER', 'DIRECTOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "TournamentInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "Color" AS ENUM ('WHITE', 'BLACK');

-- CreateEnum
CREATE TYPE "ClubRole" AS ENUM ('ADMIN', 'COORDINATOR', 'MEMBER');

-- CreateEnum
CREATE TYPE "ClubRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FriendshipStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "PairingLogic" AS ENUM ('SCORE_BASED', 'RATING_BASED');

-- CreateEnum
CREATE TYPE "PairingEngine" AS ENUM ('DUTCH', 'BURSTEIN', 'ACCELERATED');

-- CreateEnum
CREATE TYPE "PairingStatus" AS ENUM ('GENERATED', 'APPROVED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "ByeType" AS ENUM ('FULL_POINT', 'HALF_POINT', 'ZERO_POINT');

-- CreateEnum
CREATE TYPE "TieBreakMethod" AS ENUM ('BUCHHOLZ', 'MEDIAN_BUCHHOLZ', 'SONNEBORN_BERGER', 'DIRECT_ENCOUNTER', 'MOST_WINS');

-- CreateEnum
CREATE TYPE "TimeControlCategory" AS ENUM ('BULLET', 'BLITZ', 'RAPID', 'DAILY');

-- CreateEnum
CREATE TYPE "RatingCategory" AS ENUM ('BULLET', 'BLITZ', 'RAPID');

-- CreateEnum
CREATE TYPE "GameType" AS ENUM ('STANDARD', 'CHESS960');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "profileImageUrl" TEXT,
    "bio" TEXT,
    "password" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "rating" INTEGER NOT NULL DEFAULT 1200,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "tournamentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRating" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "category" "RatingCategory" NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 1200,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Puzzle" (
    "id" UUID NOT NULL,
    "initialFen" TEXT NOT NULL,
    "solution" JSONB NOT NULL,
    "movesToMate" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 1200,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Puzzle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" UUID NOT NULL,
    "whitePlayerId" UUID NOT NULL,
    "blackPlayerId" UUID,
    "winnerId" UUID,
    "puzzleId" UUID,
    "initialFen" TEXT NOT NULL DEFAULT 'startpos',
    "currentFen" TEXT NOT NULL DEFAULT 'startpos',
    "pgn" TEXT NOT NULL DEFAULT '',
    "status" "GameStatus" NOT NULL DEFAULT 'WAITING',
    "timeControl" TEXT NOT NULL DEFAULT '10+0',
    "gameMode" TEXT NOT NULL DEFAULT 'standard',
    "isRated" BOOLEAN NOT NULL DEFAULT false,
    "increment" INTEGER NOT NULL DEFAULT 0,
    "whiteRating" INTEGER,
    "blackRating" INTEGER,
    "whiteRatingAfter" INTEGER,
    "blackRatingAfter" INTEGER,
    "whiteRatingGain" INTEGER,
    "blackRatingGain" INTEGER,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tournamentId" TEXT,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameAnalysis" (
    "id" UUID NOT NULL,
    "gameId" UUID NOT NULL,
    "overall" TEXT NOT NULL DEFAULT 'Review pending',
    "whiteWinRate" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "blackWinRate" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "whiteAccuracy" DOUBLE PRECISION,
    "blackAccuracy" DOUBLE PRECISION,
    "averageAccuracy" DOUBLE PRECISION,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameState" (
    "id" UUID NOT NULL,
    "gameId" UUID NOT NULL,
    "whitePlayerLeftTime" INTEGER NOT NULL DEFAULT 0,
    "blackPlayerLeftTime" INTEGER NOT NULL DEFAULT 0,
    "increment" INTEGER NOT NULL DEFAULT 0,
    "timeSlot" TEXT NOT NULL DEFAULT '',
    "gameState" TEXT NOT NULL DEFAULT 'INITIALIZED',
    "gameMode" TEXT NOT NULL DEFAULT 'standard',
    "isRated" BOOLEAN NOT NULL DEFAULT false,
    "winnerId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Move" (
    "id" UUID NOT NULL,
    "gameId" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "moveNumber" INTEGER NOT NULL,
    "san" TEXT NOT NULL,
    "uci" TEXT,
    "fenAfter" TEXT NOT NULL,
    "fromSquare" TEXT,
    "toSquare" TEXT,
    "promotion" TEXT,
    "timeTakenMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Move_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeControl" (
    "id" TEXT NOT NULL,
    "category" "TimeControlCategory" NOT NULL,
    "initialTimeSec" INTEGER DEFAULT 0,
    "incrementSec" INTEGER DEFAULT 0,
    "daysPerMove" INTEGER DEFAULT 0,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeControl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "accessType" "TournamentAccessType" NOT NULL,
    "tournamentType" "TournamentType" NOT NULL,
    "visibility" "TournamentVisibility" NOT NULL,
    "status" "TournamentStatus" NOT NULL DEFAULT 'DRAFT',
    "creatorId" UUID NOT NULL,
    "clubId" TEXT,
    "gameType" "GameType" NOT NULL DEFAULT 'STANDARD',
    "isRated" BOOLEAN NOT NULL DEFAULT true,
    "inviteOnly" BOOLEAN NOT NULL DEFAULT false,
    "premiumOnly" BOOLEAN NOT NULL DEFAULT false,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "autoStartWhenFull" BOOLEAN NOT NULL DEFAULT false,
    "allowVacation" BOOLEAN NOT NULL DEFAULT false,
    "allowLateJoin" BOOLEAN NOT NULL DEFAULT false,
    "useTieBreaks" BOOLEAN NOT NULL DEFAULT true,
    "tieBreakMethod" "TieBreakMethod",
    "minPlayers" INTEGER,
    "maxPlayers" INTEGER,
    "minRating" INTEGER,
    "maxRating" INTEGER,
    "minGamesPlayed" INTEGER,
    "customFen" TEXT,
    "openingName" TEXT,
    "timeControlId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentTimeManagement" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "registrationOpenAt" TIMESTAMP(3) NOT NULL,
    "registrationCloseAt" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),

    CONSTRAINT "TournamentTimeManagement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwissSettings" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "totalRounds" INTEGER NOT NULL,
    "pairingEngine" "PairingEngine" NOT NULL DEFAULT 'DUTCH',
    "preventRepeatPairs" BOOLEAN NOT NULL DEFAULT true,
    "balanceColors" BOOLEAN NOT NULL DEFAULT true,
    "avoidThreeSameColors" BOOLEAN NOT NULL DEFAULT true,
    "allowBye" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SwissSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArenaSettings" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "pairingLogic" "PairingLogic" NOT NULL,
    "berserkEnabled" BOOLEAN NOT NULL DEFAULT false,
    "streakBonusEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArenaSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailySettings" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "groupSize" INTEGER NOT NULL,
    "advancePerGroup" INTEGER NOT NULL,
    "concurrentGamesPerOpponent" INTEGER NOT NULL DEFAULT 2,
    "daysPerMove" INTEGER NOT NULL,
    "allowVacation" BOOLEAN NOT NULL DEFAULT true,
    "useTieBreaks" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentParticipant" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "playerId" UUID NOT NULL,
    "role" "TournamentRole" NOT NULL DEFAULT 'PLAYER',
    "seed" INTEGER,
    "ratingAtJoin" INTEGER,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentPlayerStats" (
    "id" TEXT NOT NULL,
    "tournamentParticipantId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "currentRank" INTEGER,
    "byeReceived" BOOLEAN NOT NULL DEFAULT false,
    "consecutiveWhite" INTEGER NOT NULL DEFAULT 0,
    "consecutiveBlack" INTEGER NOT NULL DEFAULT 0,
    "totalWhiteGames" INTEGER NOT NULL DEFAULT 0,
    "totalBlackGames" INTEGER NOT NULL DEFAULT 0,
    "buchholz" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "medianBuchholz" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sonnebornBerger" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cumulativeScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "performanceRating" DOUBLE PRECISION,
    "directEncounterScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentPlayerStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Round" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "status" "RoundStatus" NOT NULL DEFAULT 'NOT_INITIALIZED',
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "roundId" TEXT,
    "groupId" TEXT,
    "gameId" UUID NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentStanding" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "playerId" UUID NOT NULL,
    "rank" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "buchholz" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "medianBuchholz" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sonnebornBerger" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "directEncounterScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentStanding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentGroup" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "groupNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentInvite" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "invitedPlayerId" UUID NOT NULL,
    "invitedById" UUID NOT NULL,
    "status" "TournamentInviteStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentBye" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "playerId" UUID NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "byeType" "ByeType" NOT NULL DEFAULT 'FULL_POINT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentBye_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PairingAudit" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "playerAId" UUID NOT NULL,
    "playerBId" UUID NOT NULL,
    "pairingScore" DOUBLE PRECISION NOT NULL,
    "sameScoreGroup" BOOLEAN NOT NULL,
    "colorConflict" BOOLEAN NOT NULL,
    "repeatOpponent" BOOLEAN NOT NULL,
    "status" "PairingStatus" NOT NULL,
    "generatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PairingAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Club" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT NOT NULL DEFAULT 'https://res.cloudinary.com/dhfyav4og/image/upload/v1779739162/defaultUser_afbf5y.jpg',
    "creatorId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrossClubInvite" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "status" "ClubRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrossClubInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubMember" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "role" "ClubRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubJoinRequest" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "status" "ClubRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubJoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubCoordinatorInvite" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "invitedUserId" UUID NOT NULL,
    "invitedById" UUID NOT NULL,
    "status" "ClubRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubCoordinatorInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Friendship" (
    "id" TEXT NOT NULL,
    "requesterId" UUID NOT NULL,
    "recipientId" UUID NOT NULL,
    "status" "FriendshipStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_RoundToTournamentGroup" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RoundToTournamentGroup_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "UserRating_userId_idx" ON "UserRating"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRating_userId_category_key" ON "UserRating"("userId", "category");

-- CreateIndex
CREATE INDEX "Game_status_idx" ON "Game"("status");

-- CreateIndex
CREATE INDEX "Game_whitePlayerId_idx" ON "Game"("whitePlayerId");

-- CreateIndex
CREATE INDEX "Game_blackPlayerId_idx" ON "Game"("blackPlayerId");

-- CreateIndex
CREATE INDEX "Game_createdAt_idx" ON "Game"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GameAnalysis_gameId_key" ON "GameAnalysis"("gameId");

-- CreateIndex
CREATE INDEX "GameAnalysis_gameId_idx" ON "GameAnalysis"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "GameState_gameId_key" ON "GameState"("gameId");

-- CreateIndex
CREATE INDEX "GameState_gameId_idx" ON "GameState"("gameId");

-- CreateIndex
CREATE INDEX "Move_playerId_idx" ON "Move"("playerId");

-- CreateIndex
CREATE INDEX "Move_gameId_idx" ON "Move"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "Move_gameId_moveNumber_key" ON "Move"("gameId", "moveNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentTimeManagement_tournamentId_key" ON "TournamentTimeManagement"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "SwissSettings_tournamentId_key" ON "SwissSettings"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "ArenaSettings_tournamentId_key" ON "ArenaSettings"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "DailySettings_tournamentId_key" ON "DailySettings"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentParticipant_tournamentId_playerId_key" ON "TournamentParticipant"("tournamentId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentPlayerStats_tournamentParticipantId_key" ON "TournamentPlayerStats"("tournamentParticipantId");

-- CreateIndex
CREATE UNIQUE INDEX "Round_tournamentId_roundNumber_key" ON "Round"("tournamentId", "roundNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentStanding_tournamentId_key" ON "TournamentStanding"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentStanding_playerId_key" ON "TournamentStanding"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentStanding_tournamentId_playerId_key" ON "TournamentStanding"("tournamentId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentGroup_tournamentId_roundNumber_groupNumber_key" ON "TournamentGroup"("tournamentId", "roundNumber", "groupNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentInvite_tournamentId_invitedPlayerId_key" ON "TournamentInvite"("tournamentId", "invitedPlayerId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentBye_tournamentId_playerId_roundNumber_key" ON "TournamentBye"("tournamentId", "playerId", "roundNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Club_name_key" ON "Club"("name");

-- CreateIndex
CREATE INDEX "CrossClubInvite_clubId_idx" ON "CrossClubInvite"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "CrossClubInvite_tournamentId_clubId_key" ON "CrossClubInvite"("tournamentId", "clubId");

-- CreateIndex
CREATE INDEX "ClubMember_clubId_idx" ON "ClubMember"("clubId");

-- CreateIndex
CREATE INDEX "ClubMember_userId_idx" ON "ClubMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubMember_clubId_userId_key" ON "ClubMember"("clubId", "userId");

-- CreateIndex
CREATE INDEX "ClubJoinRequest_clubId_idx" ON "ClubJoinRequest"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubJoinRequest_clubId_userId_key" ON "ClubJoinRequest"("clubId", "userId");

-- CreateIndex
CREATE INDEX "ClubCoordinatorInvite_clubId_idx" ON "ClubCoordinatorInvite"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubCoordinatorInvite_clubId_invitedUserId_key" ON "ClubCoordinatorInvite"("clubId", "invitedUserId");

-- CreateIndex
CREATE INDEX "Friendship_requesterId_idx" ON "Friendship"("requesterId");

-- CreateIndex
CREATE INDEX "Friendship_recipientId_idx" ON "Friendship"("recipientId");

-- CreateIndex
CREATE UNIQUE INDEX "Friendship_requesterId_recipientId_key" ON "Friendship"("requesterId", "recipientId");

-- CreateIndex
CREATE INDEX "_RoundToTournamentGroup_B_index" ON "_RoundToTournamentGroup"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRating" ADD CONSTRAINT "UserRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_whitePlayerId_fkey" FOREIGN KEY ("whitePlayerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_blackPlayerId_fkey" FOREIGN KEY ("blackPlayerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "Puzzle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameAnalysis" ADD CONSTRAINT "GameAnalysis_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameState" ADD CONSTRAINT "GameState_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Move" ADD CONSTRAINT "Move_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Move" ADD CONSTRAINT "Move_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_timeControlId_fkey" FOREIGN KEY ("timeControlId") REFERENCES "TimeControl"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentTimeManagement" ADD CONSTRAINT "TournamentTimeManagement_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwissSettings" ADD CONSTRAINT "SwissSettings_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaSettings" ADD CONSTRAINT "ArenaSettings_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySettings" ADD CONSTRAINT "DailySettings_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentParticipant" ADD CONSTRAINT "TournamentParticipant_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentParticipant" ADD CONSTRAINT "TournamentParticipant_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentPlayerStats" ADD CONSTRAINT "TournamentPlayerStats_tournamentParticipantId_fkey" FOREIGN KEY ("tournamentParticipantId") REFERENCES "TournamentParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TournamentGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentStanding" ADD CONSTRAINT "TournamentStanding_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentStanding" ADD CONSTRAINT "TournamentStanding_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentGroup" ADD CONSTRAINT "TournamentGroup_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentInvite" ADD CONSTRAINT "TournamentInvite_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentInvite" ADD CONSTRAINT "TournamentInvite_invitedPlayerId_fkey" FOREIGN KEY ("invitedPlayerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentInvite" ADD CONSTRAINT "TournamentInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentBye" ADD CONSTRAINT "TournamentBye_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentBye" ADD CONSTRAINT "TournamentBye_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PairingAudit" ADD CONSTRAINT "PairingAudit_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Club" ADD CONSTRAINT "Club_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrossClubInvite" ADD CONSTRAINT "CrossClubInvite_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrossClubInvite" ADD CONSTRAINT "CrossClubInvite_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMember" ADD CONSTRAINT "ClubMember_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMember" ADD CONSTRAINT "ClubMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubJoinRequest" ADD CONSTRAINT "ClubJoinRequest_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubJoinRequest" ADD CONSTRAINT "ClubJoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubCoordinatorInvite" ADD CONSTRAINT "ClubCoordinatorInvite_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubCoordinatorInvite" ADD CONSTRAINT "ClubCoordinatorInvite_invitedUserId_fkey" FOREIGN KEY ("invitedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubCoordinatorInvite" ADD CONSTRAINT "ClubCoordinatorInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RoundToTournamentGroup" ADD CONSTRAINT "_RoundToTournamentGroup_A_fkey" FOREIGN KEY ("A") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RoundToTournamentGroup" ADD CONSTRAINT "_RoundToTournamentGroup_B_fkey" FOREIGN KEY ("B") REFERENCES "TournamentGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
