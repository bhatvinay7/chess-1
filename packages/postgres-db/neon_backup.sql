--
-- PostgreSQL database dump
--

\restrict hbcoGHN2VMPLEighvz8IVbOKJi4BqXYjDwB5MkPoMCdsEkeplwea4FNeRzd8EJv

-- Dumped from database version 17.10 (98a80fa)
-- Dumped by pg_dump version 18.4 (Ubuntu 18.4-0ubuntu0.26.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: neondb_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO neondb_owner;

--
-- Name: ByeType; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."ByeType" AS ENUM (
    'FULL_POINT',
    'HALF_POINT',
    'ZERO_POINT'
);


ALTER TYPE public."ByeType" OWNER TO neondb_owner;

--
-- Name: ClubRequestStatus; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."ClubRequestStatus" AS ENUM (
    'PENDING',
    'ACCEPTED',
    'REJECTED'
);


ALTER TYPE public."ClubRequestStatus" OWNER TO neondb_owner;

--
-- Name: ClubRole; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."ClubRole" AS ENUM (
    'ADMIN',
    'COORDINATOR',
    'MEMBER'
);


ALTER TYPE public."ClubRole" OWNER TO neondb_owner;

--
-- Name: Color; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."Color" AS ENUM (
    'WHITE',
    'BLACK'
);


ALTER TYPE public."Color" OWNER TO neondb_owner;

--
-- Name: FriendshipStatus; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."FriendshipStatus" AS ENUM (
    'PENDING',
    'ACCEPTED',
    'REJECTED',
    'BLOCKED'
);


ALTER TYPE public."FriendshipStatus" OWNER TO neondb_owner;

--
-- Name: GameResult; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."GameResult" AS ENUM (
    'WIN',
    'LOSS',
    'DRAW'
);


ALTER TYPE public."GameResult" OWNER TO neondb_owner;

--
-- Name: GameStatus; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."GameStatus" AS ENUM (
    'WAITING',
    'ACTIVE',
    'DRAW',
    'WHITE_WIN',
    'BLACK_WIN',
    'ABANDONED'
);


ALTER TYPE public."GameStatus" OWNER TO neondb_owner;

--
-- Name: GameType; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."GameType" AS ENUM (
    'STANDARD',
    'CHESS960'
);


ALTER TYPE public."GameType" OWNER TO neondb_owner;

--
-- Name: MatchStatus; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."MatchStatus" AS ENUM (
    'NOT_STARTED',
    'IN_PROGRESS',
    'COMPLETED',
    'DRAW',
    'ABANDONED'
);


ALTER TYPE public."MatchStatus" OWNER TO neondb_owner;

--
-- Name: PairingEngine; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."PairingEngine" AS ENUM (
    'DUTCH',
    'BURSTEIN',
    'ACCELERATED'
);


ALTER TYPE public."PairingEngine" OWNER TO neondb_owner;

--
-- Name: PairingLogic; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."PairingLogic" AS ENUM (
    'SCORE_BASED',
    'RATING_BASED'
);


ALTER TYPE public."PairingLogic" OWNER TO neondb_owner;

--
-- Name: PairingStatus; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."PairingStatus" AS ENUM (
    'GENERATED',
    'APPROVED',
    'PUBLISHED'
);


ALTER TYPE public."PairingStatus" OWNER TO neondb_owner;

--
-- Name: RatingCategory; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."RatingCategory" AS ENUM (
    'BULLET',
    'BLITZ',
    'RAPID'
);


ALTER TYPE public."RatingCategory" OWNER TO neondb_owner;

--
-- Name: ResultType; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."ResultType" AS ENUM (
    'WHITE_WIN',
    'BLACK_WIN',
    'DRAW',
    'BYE'
);


ALTER TYPE public."ResultType" OWNER TO neondb_owner;

--
-- Name: RoundStatus; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."RoundStatus" AS ENUM (
    'NOT_INITIALIZED',
    'IN_PROGRESS',
    'COMPLETED'
);


ALTER TYPE public."RoundStatus" OWNER TO neondb_owner;

--
-- Name: TieBreakMethod; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."TieBreakMethod" AS ENUM (
    'BUCHHOLZ',
    'MEDIAN_BUCHHOLZ',
    'SONNEBORN_BERGER',
    'DIRECT_ENCOUNTER',
    'MOST_WINS'
);


ALTER TYPE public."TieBreakMethod" OWNER TO neondb_owner;

--
-- Name: TimeControlCategory; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."TimeControlCategory" AS ENUM (
    'BULLET',
    'BLITZ',
    'RAPID',
    'DAILY'
);


ALTER TYPE public."TimeControlCategory" OWNER TO neondb_owner;

--
-- Name: TournamentAccessType; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."TournamentAccessType" AS ENUM (
    'CLUB',
    'CROSS_CLUB',
    'OPEN',
    'PRIVATE'
);


ALTER TYPE public."TournamentAccessType" OWNER TO neondb_owner;

--
-- Name: TournamentInviteStatus; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."TournamentInviteStatus" AS ENUM (
    'PENDING',
    'ACCEPTED',
    'REJECTED'
);


ALTER TYPE public."TournamentInviteStatus" OWNER TO neondb_owner;

--
-- Name: TournamentRole; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."TournamentRole" AS ENUM (
    'PLAYER',
    'DIRECTOR',
    'ADMIN'
);


ALTER TYPE public."TournamentRole" OWNER TO neondb_owner;

--
-- Name: TournamentStatus; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."TournamentStatus" AS ENUM (
    'DRAFT',
    'REGISTRATION_OPEN',
    'REGISTRATION_CLOSED',
    'NOT_INITIALIZED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE public."TournamentStatus" OWNER TO neondb_owner;

--
-- Name: TournamentType; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."TournamentType" AS ENUM (
    'CLUB_SWISS',
    'CLUB_ROUND_ROBIN',
    'GLOBAL_SWISS',
    'GLOBAL_ROUND_ROBIN',
    'DAILY',
    'ARENA'
);


ALTER TYPE public."TournamentType" OWNER TO neondb_owner;

--
-- Name: TournamentVisibility; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."TournamentVisibility" AS ENUM (
    'PUBLIC',
    'PRIVATE',
    'CLUB_ONLY'
);


ALTER TYPE public."TournamentVisibility" OWNER TO neondb_owner;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ArenaSettings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."ArenaSettings" (
    id text NOT NULL,
    "tournamentId" text NOT NULL,
    "durationMinutes" integer NOT NULL,
    "pairingLogic" public."PairingLogic" NOT NULL,
    "berserkEnabled" boolean DEFAULT false NOT NULL,
    "streakBonusEnabled" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ArenaSettings" OWNER TO neondb_owner;

--
-- Name: Club; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Club" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "imageUrl" text DEFAULT 'https://res.cloudinary.com/dhfyav4og/image/upload/v1779739162/defaultUser_afbf5y.jpg'::text NOT NULL,
    "creatorId" uuid NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Club" OWNER TO neondb_owner;

--
-- Name: ClubCoordinatorInvite; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."ClubCoordinatorInvite" (
    id text NOT NULL,
    "clubId" text NOT NULL,
    "invitedUserId" uuid NOT NULL,
    "invitedById" uuid NOT NULL,
    status public."ClubRequestStatus" DEFAULT 'PENDING'::public."ClubRequestStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ClubCoordinatorInvite" OWNER TO neondb_owner;

--
-- Name: ClubJoinRequest; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."ClubJoinRequest" (
    id text NOT NULL,
    "clubId" text NOT NULL,
    "userId" uuid NOT NULL,
    status public."ClubRequestStatus" DEFAULT 'PENDING'::public."ClubRequestStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ClubJoinRequest" OWNER TO neondb_owner;

--
-- Name: ClubMember; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."ClubMember" (
    id text NOT NULL,
    "clubId" text NOT NULL,
    "userId" uuid NOT NULL,
    role public."ClubRole" DEFAULT 'MEMBER'::public."ClubRole" NOT NULL,
    "joinedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ClubMember" OWNER TO neondb_owner;

--
-- Name: CrossClubInvite; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."CrossClubInvite" (
    id text NOT NULL,
    "tournamentId" text NOT NULL,
    "clubId" text NOT NULL,
    status public."ClubRequestStatus" DEFAULT 'PENDING'::public."ClubRequestStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."CrossClubInvite" OWNER TO neondb_owner;

--
-- Name: DailySettings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."DailySettings" (
    id text NOT NULL,
    "tournamentId" text NOT NULL,
    "groupSize" integer NOT NULL,
    "advancePerGroup" integer NOT NULL,
    "concurrentGamesPerOpponent" integer DEFAULT 2 NOT NULL,
    "daysPerMove" integer NOT NULL,
    "allowVacation" boolean DEFAULT true NOT NULL,
    "useTieBreaks" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."DailySettings" OWNER TO neondb_owner;

--
-- Name: Friendship; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Friendship" (
    id text NOT NULL,
    "requesterId" uuid NOT NULL,
    "recipientId" uuid NOT NULL,
    status public."FriendshipStatus" DEFAULT 'PENDING'::public."FriendshipStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Friendship" OWNER TO neondb_owner;

--
-- Name: Game; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Game" (
    id uuid NOT NULL,
    "whitePlayerId" uuid NOT NULL,
    "blackPlayerId" uuid,
    "winnerId" uuid,
    "puzzleId" uuid,
    "initialFen" text DEFAULT 'startpos'::text NOT NULL,
    "currentFen" text DEFAULT 'startpos'::text NOT NULL,
    pgn text DEFAULT ''::text NOT NULL,
    status public."GameStatus" DEFAULT 'WAITING'::public."GameStatus" NOT NULL,
    "timeControl" text DEFAULT '10+0'::text NOT NULL,
    "gameMode" text DEFAULT 'standard'::text NOT NULL,
    "isRated" boolean DEFAULT false NOT NULL,
    increment integer DEFAULT 0 NOT NULL,
    "whiteRating" integer,
    "blackRating" integer,
    "whiteRatingAfter" integer,
    "blackRatingAfter" integer,
    "whiteRatingGain" integer,
    "blackRatingGain" integer,
    "startedAt" timestamp(3) without time zone,
    "endedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "tournamentId" text
);


ALTER TABLE public."Game" OWNER TO neondb_owner;

--
-- Name: GameAnalysis; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."GameAnalysis" (
    id uuid NOT NULL,
    "gameId" uuid NOT NULL,
    overall text DEFAULT 'Review pending'::text NOT NULL,
    "whiteWinRate" double precision DEFAULT 50 NOT NULL,
    "blackWinRate" double precision DEFAULT 50 NOT NULL,
    "whiteAccuracy" double precision,
    "blackAccuracy" double precision,
    "averageAccuracy" double precision,
    "reviewedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."GameAnalysis" OWNER TO neondb_owner;

--
-- Name: GameState; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."GameState" (
    id uuid NOT NULL,
    "gameId" uuid NOT NULL,
    "whitePlayerLeftTime" integer DEFAULT 0 NOT NULL,
    "blackPlayerLeftTime" integer DEFAULT 0 NOT NULL,
    increment integer DEFAULT 0 NOT NULL,
    "timeSlot" text DEFAULT ''::text NOT NULL,
    "gameState" text DEFAULT 'INITIALIZED'::text NOT NULL,
    "gameMode" text DEFAULT 'standard'::text NOT NULL,
    "isRated" boolean DEFAULT false NOT NULL,
    "winnerId" uuid,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."GameState" OWNER TO neondb_owner;

--
-- Name: Match; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Match" (
    id text NOT NULL,
    "tournamentId" text NOT NULL,
    "roundId" text,
    "groupId" text,
    "gameId" uuid NOT NULL,
    "scheduledAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "isProcessed" boolean DEFAULT false NOT NULL,
    "startedAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Match" OWNER TO neondb_owner;

--
-- Name: Move; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Move" (
    id uuid NOT NULL,
    "gameId" uuid NOT NULL,
    "playerId" uuid NOT NULL,
    "moveNumber" integer NOT NULL,
    san text NOT NULL,
    uci text,
    "fenAfter" text NOT NULL,
    "fromSquare" text,
    "toSquare" text,
    promotion text,
    "timeTakenMs" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Move" OWNER TO neondb_owner;

--
-- Name: PairingAudit; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."PairingAudit" (
    id text NOT NULL,
    "tournamentId" text NOT NULL,
    "roundNumber" integer NOT NULL,
    "playerAId" uuid NOT NULL,
    "playerBId" uuid NOT NULL,
    "pairingScore" double precision NOT NULL,
    "sameScoreGroup" boolean NOT NULL,
    "colorConflict" boolean NOT NULL,
    "repeatOpponent" boolean NOT NULL,
    status public."PairingStatus" NOT NULL,
    "generatedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."PairingAudit" OWNER TO neondb_owner;

--
-- Name: Puzzle; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Puzzle" (
    id uuid NOT NULL,
    "initialFen" text NOT NULL,
    solution jsonb NOT NULL,
    "movesToMate" integer NOT NULL,
    rating integer DEFAULT 1200 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Puzzle" OWNER TO neondb_owner;

--
-- Name: Round; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Round" (
    id text NOT NULL,
    "tournamentId" text NOT NULL,
    "roundNumber" integer NOT NULL,
    status public."RoundStatus" DEFAULT 'NOT_INITIALIZED'::public."RoundStatus" NOT NULL,
    "startTime" timestamp(3) without time zone,
    "endTime" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Round" OWNER TO neondb_owner;

--
-- Name: SwissSettings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."SwissSettings" (
    id text NOT NULL,
    "tournamentId" text NOT NULL,
    "totalRounds" integer NOT NULL,
    "pairingEngine" public."PairingEngine" DEFAULT 'DUTCH'::public."PairingEngine" NOT NULL,
    "preventRepeatPairs" boolean DEFAULT true NOT NULL,
    "balanceColors" boolean DEFAULT true NOT NULL,
    "avoidThreeSameColors" boolean DEFAULT true NOT NULL,
    "allowBye" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SwissSettings" OWNER TO neondb_owner;

--
-- Name: TimeControl; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."TimeControl" (
    id text NOT NULL,
    category public."TimeControlCategory" NOT NULL,
    "initialTimeSec" integer DEFAULT 0,
    "incrementSec" integer DEFAULT 0,
    "daysPerMove" integer DEFAULT 0,
    "displayName" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."TimeControl" OWNER TO neondb_owner;

--
-- Name: Tournament; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Tournament" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "accessType" public."TournamentAccessType" NOT NULL,
    "tournamentType" public."TournamentType" NOT NULL,
    visibility public."TournamentVisibility" NOT NULL,
    status public."TournamentStatus" DEFAULT 'DRAFT'::public."TournamentStatus" NOT NULL,
    "creatorId" uuid NOT NULL,
    "clubId" text,
    "gameType" public."GameType" DEFAULT 'STANDARD'::public."GameType" NOT NULL,
    "isRated" boolean DEFAULT true NOT NULL,
    "inviteOnly" boolean DEFAULT false NOT NULL,
    "premiumOnly" boolean DEFAULT false NOT NULL,
    "requiresApproval" boolean DEFAULT false NOT NULL,
    "autoStartWhenFull" boolean DEFAULT false NOT NULL,
    "allowVacation" boolean DEFAULT false NOT NULL,
    "allowLateJoin" boolean DEFAULT false NOT NULL,
    "useTieBreaks" boolean DEFAULT true NOT NULL,
    "tieBreakMethod" public."TieBreakMethod",
    "minPlayers" integer,
    "maxPlayers" integer,
    "minRating" integer,
    "maxRating" integer,
    "minGamesPlayed" integer,
    "customFen" text,
    "openingName" text,
    "timeControlId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public."Tournament" OWNER TO neondb_owner;

--
-- Name: TournamentBye; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."TournamentBye" (
    id text NOT NULL,
    "tournamentId" text NOT NULL,
    "playerId" uuid NOT NULL,
    "roundNumber" integer NOT NULL,
    "byeType" public."ByeType" DEFAULT 'FULL_POINT'::public."ByeType" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."TournamentBye" OWNER TO neondb_owner;

--
-- Name: TournamentGroup; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."TournamentGroup" (
    id text NOT NULL,
    "tournamentId" text NOT NULL,
    "roundNumber" integer NOT NULL,
    "groupNumber" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."TournamentGroup" OWNER TO neondb_owner;

--
-- Name: TournamentInvite; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."TournamentInvite" (
    id text NOT NULL,
    "tournamentId" text NOT NULL,
    "invitedPlayerId" uuid NOT NULL,
    "invitedById" uuid NOT NULL,
    status public."TournamentInviteStatus" DEFAULT 'PENDING'::public."TournamentInviteStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."TournamentInvite" OWNER TO neondb_owner;

--
-- Name: TournamentParticipant; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."TournamentParticipant" (
    id text NOT NULL,
    "tournamentId" text NOT NULL,
    "playerId" uuid NOT NULL,
    role public."TournamentRole" DEFAULT 'PLAYER'::public."TournamentRole" NOT NULL,
    seed integer,
    "ratingAtJoin" integer,
    "joinedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."TournamentParticipant" OWNER TO neondb_owner;

--
-- Name: TournamentPlayerStats; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."TournamentPlayerStats" (
    id text NOT NULL,
    "tournamentParticipantId" text NOT NULL,
    score double precision DEFAULT 0 NOT NULL,
    wins integer DEFAULT 0 NOT NULL,
    draws integer DEFAULT 0 NOT NULL,
    losses integer DEFAULT 0 NOT NULL,
    "currentRank" integer,
    "byeReceived" boolean DEFAULT false NOT NULL,
    "consecutiveWhite" integer DEFAULT 0 NOT NULL,
    "consecutiveBlack" integer DEFAULT 0 NOT NULL,
    "totalWhiteGames" integer DEFAULT 0 NOT NULL,
    "totalBlackGames" integer DEFAULT 0 NOT NULL,
    buchholz double precision DEFAULT 0 NOT NULL,
    "medianBuchholz" double precision DEFAULT 0 NOT NULL,
    "sonnebornBerger" double precision DEFAULT 0 NOT NULL,
    "cumulativeScore" double precision DEFAULT 0 NOT NULL,
    "performanceRating" double precision,
    "directEncounterScore" double precision DEFAULT 0 NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."TournamentPlayerStats" OWNER TO neondb_owner;

--
-- Name: TournamentStanding; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."TournamentStanding" (
    id text NOT NULL,
    "tournamentId" text NOT NULL,
    "playerId" uuid NOT NULL,
    rank integer NOT NULL,
    score double precision NOT NULL,
    wins integer DEFAULT 0 NOT NULL,
    draws integer DEFAULT 0 NOT NULL,
    losses integer DEFAULT 0 NOT NULL,
    buchholz double precision DEFAULT 0 NOT NULL,
    "medianBuchholz" double precision DEFAULT 0 NOT NULL,
    "sonnebornBerger" double precision DEFAULT 0 NOT NULL,
    "directEncounterScore" double precision DEFAULT 0 NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."TournamentStanding" OWNER TO neondb_owner;

--
-- Name: TournamentTimeManagement; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."TournamentTimeManagement" (
    id text NOT NULL,
    "tournamentId" text NOT NULL,
    "registrationOpenAt" timestamp(3) without time zone NOT NULL,
    "registrationCloseAt" timestamp(3) without time zone NOT NULL,
    "startTime" timestamp(3) without time zone NOT NULL,
    "endTime" timestamp(3) without time zone
);


ALTER TABLE public."TournamentTimeManagement" OWNER TO neondb_owner;

--
-- Name: User; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."User" (
    id uuid NOT NULL,
    username text NOT NULL,
    email text,
    "profileImageUrl" text,
    bio text,
    password text,
    "isAdmin" boolean DEFAULT false NOT NULL,
    rating integer DEFAULT 1200 NOT NULL,
    wins integer DEFAULT 0 NOT NULL,
    losses integer DEFAULT 0 NOT NULL,
    draws integer DEFAULT 0 NOT NULL,
    "tournamentId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."User" OWNER TO neondb_owner;

--
-- Name: UserRating; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."UserRating" (
    id text NOT NULL,
    "userId" uuid NOT NULL,
    category public."RatingCategory" NOT NULL,
    rating integer DEFAULT 1200 NOT NULL,
    wins integer DEFAULT 0 NOT NULL,
    losses integer DEFAULT 0 NOT NULL,
    draws integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."UserRating" OWNER TO neondb_owner;

--
-- Name: _RoundToTournamentGroup; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."_RoundToTournamentGroup" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_RoundToTournamentGroup" OWNER TO neondb_owner;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO neondb_owner;

--
-- Data for Name: ArenaSettings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."ArenaSettings" (id, "tournamentId", "durationMinutes", "pairingLogic", "berserkEnabled", "streakBonusEnabled", "createdAt") FROM stdin;
\.


--
-- Data for Name: Club; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Club" (id, name, description, "imageUrl", "creatorId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ClubCoordinatorInvite; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."ClubCoordinatorInvite" (id, "clubId", "invitedUserId", "invitedById", status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ClubJoinRequest; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."ClubJoinRequest" (id, "clubId", "userId", status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ClubMember; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."ClubMember" (id, "clubId", "userId", role, "joinedAt") FROM stdin;
\.


--
-- Data for Name: CrossClubInvite; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."CrossClubInvite" (id, "tournamentId", "clubId", status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: DailySettings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."DailySettings" (id, "tournamentId", "groupSize", "advancePerGroup", "concurrentGamesPerOpponent", "daysPerMove", "allowVacation", "useTieBreaks", "createdAt") FROM stdin;
\.


--
-- Data for Name: Friendship; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Friendship" (id, "requesterId", "recipientId", status, "createdAt", "updatedAt") FROM stdin;
cmqr0daam00019zf54t72zlnw	d2077c67-d484-4a1d-928f-7a669c02fd0d	bc772c22-2600-42ee-9e82-55a06398492e	ACCEPTED	2026-06-23 18:59:17.47	2026-06-23 18:59:25.67
\.


--
-- Data for Name: Game; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Game" (id, "whitePlayerId", "blackPlayerId", "winnerId", "puzzleId", "initialFen", "currentFen", pgn, status, "timeControl", "gameMode", "isRated", increment, "whiteRating", "blackRating", "whiteRatingAfter", "blackRatingAfter", "whiteRatingGain", "blackRatingGain", "startedAt", "endedAt", "createdAt", "updatedAt", "tournamentId") FROM stdin;
884dc86a-8d97-4207-a928-6259466d174b	bc772c22-2600-42ee-9e82-55a06398492e	d2077c67-d484-4a1d-928f-7a669c02fd0d	\N	\N	bnrbqknr/pppppppp/8/8/8/8/PPPPPPPP/BNRBQKNR w HChc - 0 1	bnrbqknr/pppppppp/8/8/8/8/PPPPPPPP/BNRBQKNR w HChc - 0 1		ACTIVE	5+0	chess960	t	0	1200	1200	\N	\N	\N	\N	\N	\N	2026-06-23 17:40:51.741	2026-06-23 17:40:51.741	\N
b44d811e-99e1-4bfe-9468-bbf6f1af8af8	bc772c22-2600-42ee-9e82-55a06398492e	d2077c67-d484-4a1d-928f-7a669c02fd0d	\N	\N	rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1	rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1		ACTIVE	5+0	standard	t	0	1200	1200	\N	\N	\N	\N	\N	\N	2026-06-23 17:40:52.123	2026-06-23 17:40:52.123	\N
d07df430-4823-4908-a948-66faf97529b9	bc772c22-2600-42ee-9e82-55a06398492e	d2077c67-d484-4a1d-928f-7a669c02fd0d	\N	\N	rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1	rnbqkbnr/ppp1pppp/8/3p4/5P2/8/PPPPP1PP/RNBQKBNR w KQkq - 0 2	1. f2f4 d7d5	DRAW	5+0	standard	t	0	1200	1200	1200	1200	0	0	2026-06-23 17:41:12.298	2026-06-23 17:41:12.298	2026-06-23 17:40:52.398	2026-06-23 17:41:12.298	\N
e686ed1a-113c-428c-9831-afba7d653297	bc772c22-2600-42ee-9e82-55a06398492e	d2077c67-d484-4a1d-928f-7a669c02fd0d	\N	\N	nrkrqbbn/pppppppp/8/8/8/8/PPPPPPPP/NRKRQBBN w DBdb - 0 1	nrkrqbbn/pppppppp/8/8/8/8/PPPPPPPP/NRKRQBBN w DBdb - 0 1		ACTIVE	5+0	chess960	t	0	1200	1200	\N	\N	\N	\N	\N	\N	2026-06-23 17:52:41.33	2026-06-23 17:52:41.33	\N
7e28a67a-c6c6-4d30-bed8-6e1e6e3245ee	bc772c22-2600-42ee-9e82-55a06398492e	d2077c67-d484-4a1d-928f-7a669c02fd0d	\N	\N	rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1	rnb1kbnr/pp3ppp/1q2p3/3p4/2PP1P2/1p1Q1N2/P2BP1PP/RN2KB1R b KQkq - 0 8	1. d2d4 e7e6 2. f2f4 c7c5 3. g1f3 d7d5 4. d1d3 d8a5 5. c1d2 a5b6 6. b2b4 c5b4 7. c2c3 b4b3 8. c3c4	DRAW	5+0	standard	t	0	1200	1200	1200	1200	0	0	2026-06-23 17:54:41.368	2026-06-23 17:54:41.368	2026-06-23 17:52:42.391	2026-06-23 17:54:41.368	\N
8771a639-2b72-461c-978f-c1cb9d2f0cf3	bc772c22-2600-42ee-9e82-55a06398492e	d2077c67-d484-4a1d-928f-7a669c02fd0d	\N	\N	nbrkbnqr/pppppppp/8/8/8/8/PPPPPPPP/NBRKBNQR w HChc - 0 1	nbrkbnqr/pppppppp/8/8/8/8/PPPPPPPP/NBRKBNQR w HChc - 0 1		ACTIVE	5+0	chess960	t	0	1200	1200	\N	\N	\N	\N	\N	\N	2026-06-23 18:24:51.163	2026-06-23 18:24:51.163	\N
0c6cda1c-fe64-418a-8c85-133c2c12439c	bc772c22-2600-42ee-9e82-55a06398492e	d2077c67-d484-4a1d-928f-7a669c02fd0d	d2077c67-d484-4a1d-928f-7a669c02fd0d	\N	rqbnnkrb/pppppppp/8/8/8/8/PPPPPPPP/RQBNNKRB w GAga - 0 1	rqbnnkrb/ppp1pppp/8/3p4/5P2/8/PPPPP1PP/RQBNNKRB w KQkq - 0 2	1. f2f4 d7d5	BLACK_WIN	5+0	chess960	t	0	1200	1200	1184	1216	-16	16	2026-06-23 18:29:55.665	2026-06-23 18:29:55.665	2026-06-23 18:24:51.544	2026-06-23 18:29:55.665	\N
bcdd6932-90eb-43f2-ac33-4c1982c56d40	bc772c22-2600-42ee-9e82-55a06398492e	d2077c67-d484-4a1d-928f-7a669c02fd0d	\N	\N	rnqnkbbr/pppppppp/8/8/8/8/PPPPPPPP/RNQNKBBR w KQkq - 0 1	rnqnkbbr/pppppppp/8/8/8/8/PPPPPPPP/RNQNKBBR w KQkq - 0 1		ACTIVE	5+0	chess960	t	0	1200	1200	\N	\N	\N	\N	\N	\N	2026-06-23 18:31:38.658	2026-06-23 18:31:38.658	\N
368985f4-33bf-44df-acb3-4314861213a2	bc772c22-2600-42ee-9e82-55a06398492e	d2077c67-d484-4a1d-928f-7a669c02fd0d	\N	\N	bnrqkbrn/pppppppp/8/8/8/8/PPPPPPPP/BNRQKBRN w GCgc - 0 1	b1r1kbrn/pp1npppp/8/q1pp4/6P1/4PBR1/PPPP1P1P/BNRQK2N b KQkq - 2 5	1. g2g4 c7c5 2. g1g3 d8a5 3. f1g2 d7d5 4. e2e3 b8d7 5. g2f3	DRAW	5+0	chess960	t	0	1200	1200	1200	1200	0	0	2026-06-23 18:34:13.586	2026-06-23 18:34:13.586	2026-06-23 18:31:39.054	2026-06-23 18:34:13.586	\N
61d6ac02-d858-4daf-85a4-7441b02e7bd1	bc772c22-2600-42ee-9e82-55a06398492e	d2077c67-d484-4a1d-928f-7a669c02fd0d	\N	\N	bnrqknrb/pppppppp/8/8/8/8/PPPPPPPP/BNRQKNRB w GCgc - 0 1	bnrqknrb/pppppppp/8/8/8/8/PPPPPPPP/BNRQKNRB w GCgc - 0 1		ACTIVE	5+0	chess960	t	0	1200	1200	\N	\N	\N	\N	\N	\N	2026-06-23 18:42:13.799	2026-06-23 18:42:13.799	\N
0ab0ddd2-8b71-454f-a7fb-53833eac9266	bc772c22-2600-42ee-9e82-55a06398492e	d2077c67-d484-4a1d-928f-7a669c02fd0d	bc772c22-2600-42ee-9e82-55a06398492e	\N	qbnrknbr/pppppppp/8/8/8/8/PPPPPPPP/QBNRKNBR w HDhd - 0 1	qbnrknbr/pppppppp/8/8/8/6N1/PPPPPPPP/QBNRK1BR b KQkq - 1 1	1. f1g3	WHITE_WIN	5+0	chess960	t	0	1200	1200	1216	1184	16	-16	2026-06-23 18:47:48.224	2026-06-23 18:47:48.224	2026-06-23 18:42:14.621	2026-06-23 18:47:48.224	\N
6a0f5227-60ce-4a2c-9052-3f1b4b5856fe	bc772c22-2600-42ee-9e82-55a06398492e	d2077c67-d484-4a1d-928f-7a669c02fd0d	\N	\N	qbrkbnrn/pppppppp/8/8/8/8/PPPPPPPP/QBRKBNRN w GCgc - 0 1	qbrkbnrn/pppppppp/8/8/8/8/PPPPPPPP/QBRKBNRN w GCgc - 0 1		ACTIVE	5+0	chess960	t	0	1200	1200	\N	\N	\N	\N	\N	\N	2026-06-23 18:55:39.03	2026-06-23 18:55:39.03	\N
bb1c27a4-4ff5-4bef-98fc-a4ecfb42c942	bc772c22-2600-42ee-9e82-55a06398492e	d2077c67-d484-4a1d-928f-7a669c02fd0d	\N	\N	rbnqknbr/pppppppp/8/8/8/8/PPPPPPPP/RBNQKNBR w KQkq - 0 1	rbnqknbr/pppppppp/8/8/8/8/PPPPPPPP/RBNQKNBR w KQkq - 0 1		ACTIVE	5+0	chess960	t	0	1200	1200	\N	\N	\N	\N	\N	\N	2026-06-23 18:55:39.786	2026-06-23 18:55:39.786	\N
3381b55b-c32b-415e-a11a-386702508d7e	bc772c22-2600-42ee-9e82-55a06398492e	d2077c67-d484-4a1d-928f-7a669c02fd0d	\N	\N	rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1	r1bqkbnr/p1ppp1pp/2n5/1p3p2/2P1PP2/5Q2/PP1P2PP/RNB1KBNR b KQkq - 1 4	1. f2f4 b7b5 2. c2c4 b8c6 3. e2e4 f7f5 4. d1f3	DRAW	5+0	standard	t	0	1200	1200	1200	1200	0	0	2026-06-23 19:03:24.155	2026-06-23 19:03:24.155	2026-06-23 19:02:40.921	2026-06-23 19:03:24.155	\N
46c5a68e-1f28-4667-993e-665d3dcd118c	bc772c22-2600-42ee-9e82-55a06398492e	d2077c67-d484-4a1d-928f-7a669c02fd0d	\N	\N	rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1	rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1		DRAW	5+0	standard	t	0	1200	1200	1200	1200	0	0	2026-06-23 19:10:11.764	2026-06-23 19:10:11.764	2026-06-23 19:09:54.572	2026-06-23 19:10:11.764	\N
92a027de-df3f-49b6-9029-d40ffcf5b293	bc772c22-2600-42ee-9e82-55a06398492e	d2077c67-d484-4a1d-928f-7a669c02fd0d	\N	\N	rqnkbbrn/pppppppp/8/8/8/8/PPPPPPPP/RQNKBBRN w GAga - 0 1	rqnkbbrn/pppppppp/8/8/8/8/PPPPPPPP/RQNKBBRN w GAga - 0 1		ACTIVE	5+0	chess960	t	0	1200	1200	\N	\N	\N	\N	\N	\N	2026-06-23 19:10:29.148	2026-06-23 19:10:29.148	\N
7e27ee1b-7bc6-4db7-8578-0022aacdfd99	bc772c22-2600-42ee-9e82-55a06398492e	d2077c67-d484-4a1d-928f-7a669c02fd0d	bc772c22-2600-42ee-9e82-55a06398492e	\N	rqnnbbkr/pppppppp/8/8/8/8/PPPPPPPP/RQNNBBKR w HAha - 0 1	rq1nbbkr/p2ppppp/1p1n4/2p5/2P2P2/3N2B1/PP1PP1PP/RQ1N1BKR b KQkq - 1 4	1. f2f4 b7b6 2. c2c4 c8d6 3. e1g3 c7c5 4. c1d3	WHITE_WIN	5+0	chess960	t	0	1200	1200	1216	1184	16	-16	2026-06-23 19:16:26.1	2026-06-23 19:16:26.1	2026-06-23 19:10:29.613	2026-06-23 19:16:26.1	\N
06cab2eb-afb6-4717-bdc8-8e20544ca5eb	bc772c22-2600-42ee-9e82-55a06398492e	d2077c67-d484-4a1d-928f-7a669c02fd0d	\N	\N	rnnqbbkr/pppppppp/8/8/8/8/PPPPPPPP/RNNQBBKR w HAha - 0 1	rnnqbbkr/pppppppp/8/8/8/8/PPPPPPPP/RNNQBBKR w HAha - 0 1		ACTIVE	5+0	chess960	t	0	1200	1200	\N	\N	\N	\N	\N	\N	2026-06-23 19:20:35.319	2026-06-23 19:20:35.319	\N
ecda3a92-fc3e-4bc6-a141-2f9371c800b4	bc772c22-2600-42ee-9e82-55a06398492e	d2077c67-d484-4a1d-928f-7a669c02fd0d	bc772c22-2600-42ee-9e82-55a06398492e	\N	qrbnkbnr/pppppppp/8/8/8/8/PPPPPPPP/QRBNKBNR w HBhb - 0 1	qr1nkbnr/p4ppp/b7/1p1p4/3pPP2/3P4/PPP3PP/QRB1KB1R w KQkq - 0 8	1. f2f4 b7b5 2. d1e3 c8a6 3. g1f3 d7d5 4. e3d5 c7c5 5. f3d4 c5d4 6. d2d3 e7e6 7. e2e4 e6d5	WHITE_WIN	5+0	chess960	t	0	1200	1200	1216	1184	16	-16	2026-06-23 19:21:47.297	2026-06-23 19:21:47.297	2026-06-23 19:20:35.732	2026-06-23 19:21:47.297	\N
4f131889-c3b8-4b28-98c0-00296c5324f1	bc772c22-2600-42ee-9e82-55a06398492e	d2077c67-d484-4a1d-928f-7a669c02fd0d	\N	\N	rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1	rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1		ACTIVE	5+0	standard	t	0	1200	1200	\N	\N	\N	\N	\N	\N	2026-06-24 05:50:01.144	2026-06-24 05:50:01.144	\N
e4f0deb4-92dc-4ed9-9867-bd80804f4391	bc772c22-2600-42ee-9e82-55a06398492e	d2077c67-d484-4a1d-928f-7a669c02fd0d	bc772c22-2600-42ee-9e82-55a06398492e	\N	rnknbrqb/pppppppp/8/8/8/8/PPPPPPPP/RNKNBRQB w FAfa - 0 1	rnqbbnkr/pppppppp/8/8/4P3/8/PPPP1PPP/RNQBBNKR b KQkq - 0 1	1. e2e4	WHITE_WIN	5+0	chess960	t	0	1216	1184	1231	1169	15	-15	2026-06-24 05:50:00.889	2026-06-24 05:50:00.889	2026-06-24 04:55:03.199	2026-06-24 05:50:00.889	cmqrld7pe000h9zzlc8kmiro2
57e737b6-d66e-4ea7-a832-210349520b25	bc772c22-2600-42ee-9e82-55a06398492e	d2077c67-d484-4a1d-928f-7a669c02fd0d	\N	\N	rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1	rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1		ACTIVE	5+0	standard	t	0	1200	1200	\N	\N	\N	\N	\N	\N	2026-06-24 05:50:01.424	2026-06-24 05:50:01.424	\N
66ba4f9c-7696-4352-8562-ed0df058546c	d2077c67-d484-4a1d-928f-7a669c02fd0d	bc772c22-2600-42ee-9e82-55a06398492e	bc772c22-2600-42ee-9e82-55a06398492e	\N	rbkqrnbn/pppppppp/8/8/8/8/PPPPPPPP/RBKQRNBN w EAea - 0 1	rbknqrbn/pppppppp/8/8/8/8/PPPPPPPP/RBKNQRBN w FAfa - 0 1		BLACK_WIN	5+0	chess960	t	0	1184	1216	1169	1231	-15	15	2026-06-24 05:50:05.645	2026-06-24 05:50:05.645	2026-06-24 04:55:03.199	2026-06-24 05:50:05.645	cmqrld7pe000h9zzlc8kmiro2
dcc39331-6658-4251-b554-95b204d9b188	bc772c22-2600-42ee-9e82-55a06398492e	d2077c67-d484-4a1d-928f-7a669c02fd0d	bc772c22-2600-42ee-9e82-55a06398492e	\N	rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1	8/p3R2p/7k/5rp1/8/7Q/4N1PP/6K1 b - - 1 39	1. d2d4 e7e5 2. g1f3 c7c5 3. e2e3 d7d5 4. f1d3 f7f6 5. e1g1 b7b5 6. d4e5 f6e5 7. f3e5 d8d6 8. d3b5 c8d7 9. d1g4 b8c6 10. g4h5 g7g6 11. h5h4 c6e5 12. b5d7 e5d7 13. f2f4 a8b8 14. f4f5 g8e7 15. f5f6 e7f5 16. h4g5 d7f6 17. b1c3 d6e6 18. c1d2 b8b2 19. a1e1 b2c2 20. e1e2 d5d4 21. e3d4 e6e2 22. c3e2 c2a2 23. g5f6 h8g8 24. f6e6 f8e7 25. e6c6 e8f7 26. d4d5 c5c4 27. d5d6 c4c3 28. d6d7 c3c2 29. d7d8 c2c1 30. f1c1 a2a5 31. d8g8 f7g8 32. c6c8 e7f8 33. c1c7 f5e7 34. c8e6 g8g7 35. d2g5 a5f5 36. g5e7 f8e7 37. c7e7 g7h6 38. e6e3 g6g5 39. e3h3	WHITE_WIN	5+0	standard	t	0	1200	1200	1216	1184	16	-16	2026-06-24 05:50:11.247	2026-06-24 05:50:11.247	2026-06-24 05:50:01.699	2026-06-24 05:50:11.247	\N
48c1943e-fda4-4817-8c82-02ec275c1e80	bc772c22-2600-42ee-9e82-55a06398492e	d2077c67-d484-4a1d-928f-7a669c02fd0d	\N	\N	rkbnqbrn/pppppppp/8/8/8/8/PPPPPPPP/RKBNQBRN w GAga - 0 1	rkbnqbrn/pppppppp/8/8/8/8/PPPPPPPP/RKBNQBRN w GAga - 0 1		ACTIVE	5+0	chess960	t	0	1200	1200	\N	\N	\N	\N	\N	\N	2026-06-24 06:58:26.098	2026-06-24 06:58:26.098	\N
480edd88-6f53-4673-9bb1-f75da664b910	bc772c22-2600-42ee-9e82-55a06398492e	d2077c67-d484-4a1d-928f-7a669c02fd0d	d2077c67-d484-4a1d-928f-7a669c02fd0d	\N	nrbbnkrq/pppppppp/8/8/8/8/PPPPPPPP/NRBBNKRQ w GBgb - 0 1	nrbb1kr1/pp1pppqp/5np1/2p5/4P3/3N2P1/PPPP1PQP/NRBB1RK1 b kq - 3 5	1. e2e4 c7c5 2. e1d3 e8f6 3. g2g3 g7g6 4. h1g2 h8g7 5. f1g1	BLACK_WIN	5+0	chess960	t	0	1200	1200	1184	1216	-16	16	2026-06-24 07:02:10.569	2026-06-24 07:02:10.569	2026-06-24 06:58:26.744	2026-06-24 07:02:10.569	\N
4a3e3e2f-4c80-498a-baea-c3129a6a8fb0	bc772c22-2600-42ee-9e82-55a06398492e	d2077c67-d484-4a1d-928f-7a669c02fd0d	\N	\N	rkqrbbnn/pppppppp/8/8/8/8/PPPPPPPP/RKQRBBNN w DAda - 0 1	rkqrbbnn/pppppppp/8/8/8/8/PPPPPPPP/RKQRBBNN w DAda - 0 1		ACTIVE	5+0	chess960	t	0	1200	1200	\N	\N	\N	\N	\N	\N	2026-06-24 07:23:46.276	2026-06-24 07:23:46.276	\N
1ba570f0-9f45-4969-a470-c8f270e9cb7e	bc772c22-2600-42ee-9e82-55a06398492e	d2077c67-d484-4a1d-928f-7a669c02fd0d	bc772c22-2600-42ee-9e82-55a06398492e	\N	nbbrknrq/pppppppp/8/8/8/8/PPPPPPPP/NBBRKNRQ w GDgd - 0 1	nbbrknrq/p4ppp/2p5/1p1pp3/5P2/4N1P1/PPPPP1QP/NBBR1RK1 b kq - 1 5	1. f2f4 b7b5 2. f1e3 e7e5 3. g2g3 d7d5 4. h1g2 c7c6 5. e1g1	WHITE_WIN	5+0	chess960	t	0	1200	1200	1216	1184	16	-16	2026-06-24 07:25:50.456	2026-06-24 07:25:50.456	2026-06-24 07:23:46.797	2026-06-24 07:25:50.456	\N
e6cd2ad4-c7c7-46f2-8396-fdc64fbea5dd	bc772c22-2600-42ee-9e82-55a06398492e	d2077c67-d484-4a1d-928f-7a669c02fd0d	\N	\N	qbnrbkrn/pppppppp/8/8/8/8/PPPPPPPP/QBNRBKRN w GDgd - 0 1	qbnrbkrn/pppppppp/8/8/8/8/PPPPPPPP/QBNRBKRN w GDgd - 0 1		ACTIVE	5+0	chess960	t	0	1200	1200	\N	\N	\N	\N	\N	\N	2026-06-24 07:34:24.296	2026-06-24 07:34:24.296	\N
7d8f6044-897b-46d4-966f-cb5f7964030e	bc772c22-2600-42ee-9e82-55a06398492e	d2077c67-d484-4a1d-928f-7a669c02fd0d	\N	\N	rkrnnbbq/pppppppp/8/8/8/8/PPPPPPPP/RKRNNBBQ w CAca - 0 1	r1k2bbq/ppp1pppp/8/8/3RpP2/1P6/PKP1P1PP/R3NB1Q b - - 0 11	1. d2d4 d7d5 2. d1c3 d8c6 3. c1d1 c8d8 4. b2b3 b8c8 5. b1b2 d8d6 6. d1d3 e8f6 7. f2f4 f6e4 8. c3e4 d5e4 9. d3d1 c6d4 10. g1d4 d6d4 11. d1d4	DRAW	5+0	chess960	t	0	1200	1200	1200	1200	0	0	2026-06-24 07:38:49.509	2026-06-24 07:38:49.509	2026-06-24 07:34:24.929	2026-06-24 07:38:49.509	\N
32c0b219-e0ad-4ea2-b5ca-0b5edf2b9675	bc772c22-2600-42ee-9e82-55a06398492e	d2077c67-d484-4a1d-928f-7a669c02fd0d	bc772c22-2600-42ee-9e82-55a06398492e	\N	rqnnbbkr/pppppppp/8/8/8/8/PPPPPPPP/RQNNBBKR w HAha - 0 1	rq2bbkr/pp3ppp/2p1n3/4p3/3PpP2/1N6/PPP3PP/R1QNBRK1 b kq - 1 8	1. d2d4 e7e5 2. f2f4 c8d6 3. c1b3 c7c6 4. e2e4 d6e4 5. b1c1 d7d5 6. f1d3 d8e6 7. d3e4 d5e4 8. g1h1	WHITE_WIN	5+0	chess960	t	0	1200	1200	1216	1184	16	-16	2026-06-24 09:30:34.888	2026-06-24 09:30:34.888	2026-06-24 09:09:03.106	2026-06-24 09:30:34.888	cmqrufizd000g9zlhhvd10ppb
115f48c9-9ce0-4871-bd2c-c96c214974ee	d2077c67-d484-4a1d-928f-7a669c02fd0d	bc772c22-2600-42ee-9e82-55a06398492e	d2077c67-d484-4a1d-928f-7a669c02fd0d	\N	rqnnbbkr/pppppppp/8/8/8/8/PPPPPPPP/RQNNBBKR w HAha - 0 1	5rk1/p5pp/1b6/1p1b4/1P3PQ1/2P1p1B1/P1Rr2PP/3B3K b - - 4 27	1. d2d4 d7d5 2. e2e3 e7e6 3. f1e2 f8e7 4. c1d3 c8d6 5. g1h1 g8h8 6. f2f4 b7b5 7. b2b4 b8b7 8. d3e5 f7f5 9. e1g3 e7f6 10. d1c3 d8c6 11. e5c6 b7c6 12. e3e4 d5e4 13. b1b3 c6d7 14. d4d5 e6d5 15. b3d5 e8f7 16. d5d2 d6c4 17. d2d7 a8d8 18. d7c7 f6c3 19. a1c1 c4e3 20. f1d1 e3d1 21. e2d1 c3d4 22. g1h1 e4e3 23. c2c3 d4b6 24. c7e5 d8d3 25. e5f5 f7d5 26. f5g4 d3d2 27. c1c2	WHITE_WIN	5+0	chess960	t	0	1200	1200	1216	1184	16	-16	2026-06-24 09:52:49.488	2026-06-24 09:52:49.488	2026-06-24 09:09:03.106	2026-06-24 09:52:49.488	cmqrufizd000g9zlhhvd10ppb
dd9a7fe9-1098-4139-9d35-8040762b4b2c	bc772c22-2600-42ee-9e82-55a06398492e	d2077c67-d484-4a1d-928f-7a669c02fd0d	\N	\N	rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1	rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1		ACTIVE	5+0	standard	t	0	1200	1200	\N	\N	\N	\N	\N	\N	2026-06-24 10:07:25.483	2026-06-24 10:07:25.483	\N
2e27e16c-50e1-4f3b-a305-98d69933d185	bc772c22-2600-42ee-9e82-55a06398492e	d2077c67-d484-4a1d-928f-7a669c02fd0d	bc772c22-2600-42ee-9e82-55a06398492e	\N	rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1	rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1	1. d2d4	WHITE_WIN	5+0	standard	t	0	1200	1200	1216	1184	16	-16	2026-06-24 10:13:04.164	2026-06-24 10:13:04.164	2026-06-24 10:07:25.973	2026-06-24 10:13:04.164	\N
6f3e13dc-7cbc-4209-943e-29dc5bdd00a0	d2077c67-d484-4a1d-928f-7a669c02fd0d	bc772c22-2600-42ee-9e82-55a06398492e	\N	\N	rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1	rnbqkbnr/pppp2pp/8/4Np2/3P4/8/PPP1PPPP/RNBQKB1R b KQkq - 0 3	1. d2d4 e7e5 2. g1f3 f7f5 3. f3e5	DRAW	5+0	standard	t	0	1184	1216	1185	1215	1	-1	2026-06-25 17:13:57.319	2026-06-25 17:13:57.319	2026-06-25 17:13:30.382	2026-06-25 17:13:57.319	\N
e5157207-f17f-4a54-98e9-057d50e52ccc	d2077c67-d484-4a1d-928f-7a669c02fd0d	bc772c22-2600-42ee-9e82-55a06398492e	\N	\N	rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1	rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1		DRAW	5+0	standard	t	0	1184	1216	1185	1215	1	-1	2026-06-25 17:14:07.513	2026-06-25 17:14:07.513	2026-06-25 17:14:07.513	2026-06-25 17:14:07.513	\N
5300e559-9ae3-4de4-b585-fe84784659e1	d2077c67-d484-4a1d-928f-7a669c02fd0d	bc772c22-2600-42ee-9e82-55a06398492e	\N	\N	rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1	rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1		DRAW	5+0	standard	f	0	\N	\N	\N	\N	\N	\N	2026-06-25 17:20:07.833	2026-06-25 17:20:07.833	2026-06-25 17:20:07.833	2026-06-25 17:20:07.833	\N
063ef71a-1bd0-42f8-8a8a-5d333d92aa2f	d2077c67-d484-4a1d-928f-7a669c02fd0d	bc772c22-2600-42ee-9e82-55a06398492e	\N	\N	rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1	rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1		DRAW	3+0	standard	f	0	\N	\N	\N	\N	\N	\N	2026-06-25 17:22:22.355	2026-06-25 17:22:22.355	2026-06-25 17:22:22.355	2026-06-25 17:22:22.355	\N
\.


--
-- Data for Name: GameAnalysis; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."GameAnalysis" (id, "gameId", overall, "whiteWinRate", "blackWinRate", "whiteAccuracy", "blackAccuracy", "averageAccuracy", "reviewedAt", "createdAt", "updatedAt") FROM stdin;
7a69895a-f22d-4599-a5b9-51ca65770616	d07df430-4823-4908-a948-66faf97529b9	Balanced draw	50	50	\N	\N	\N	\N	2026-06-23 17:41:12.298	2026-06-23 17:41:12.298
1e95b4fd-ff74-424a-b933-a59123ed5280	7e28a67a-c6c6-4d30-bed8-6e1e6e3245ee	Balanced draw	50	50	\N	\N	\N	\N	2026-06-23 17:54:41.368	2026-06-23 17:54:41.368
677f7aff-15d1-4d21-9189-e01145bc0d3c	0ab0ddd2-8b71-454f-a7fb-53833eac9266	White converted the game	100	0	\N	\N	\N	\N	2026-06-23 18:47:48.224	2026-06-23 18:47:48.224
18c267f0-222c-4668-9c0b-913fb925d665	3381b55b-c32b-415e-a11a-386702508d7e	Balanced draw	50	50	\N	\N	\N	\N	2026-06-23 19:03:24.155	2026-06-23 19:03:24.155
9fbc543e-4543-424a-bd54-6ba31597d7cd	46c5a68e-1f28-4667-993e-665d3dcd118c	Balanced draw	50	50	\N	\N	\N	\N	2026-06-23 19:10:11.764	2026-06-23 19:10:11.764
956419be-8b5c-44c0-8cdd-c308c090361f	7e27ee1b-7bc6-4db7-8578-0022aacdfd99	White converted the game	100	0	\N	\N	\N	\N	2026-06-23 19:16:26.1	2026-06-23 19:16:26.1
403c1550-8b7d-4513-b6e7-94f1d775805f	ecda3a92-fc3e-4bc6-a141-2f9371c800b4	White converted the game	100	0	\N	\N	\N	\N	2026-06-23 19:21:47.297	2026-06-23 19:21:47.297
bcbf7cad-219b-4ba7-a565-eda82634a60a	0c6cda1c-fe64-418a-8c85-133c2c12439c	Black converted the game	0	100	0.4	83.5	42	2026-06-23 19:41:55.71	2026-06-23 18:29:55.665	2026-06-23 19:41:55.711
f89d12f7-0288-4229-a734-7d48a7483edf	e4f0deb4-92dc-4ed9-9867-bd80804f4391	White converted the game	100	0	\N	\N	\N	\N	2026-06-24 05:50:00.889	2026-06-24 05:50:00.889
3fdb767f-9eb2-4888-9b73-9dd40cd677d4	66ba4f9c-7696-4352-8562-ed0df058546c	Black converted the game	0	100	\N	\N	\N	\N	2026-06-24 05:50:05.645	2026-06-24 05:50:05.645
139aa3dc-ba9f-41a5-9c0e-f141aee81629	480edd88-6f53-4673-9bb1-f75da664b910	Black converted the game	0	100	\N	\N	\N	\N	2026-06-24 07:02:10.569	2026-06-24 07:02:10.569
8fa4fd2d-85a6-4e4b-a56d-24c17ee6cc1f	1ba570f0-9f45-4969-a470-c8f270e9cb7e	White converted the game	100	0	\N	\N	\N	\N	2026-06-24 07:25:50.456	2026-06-24 07:25:50.456
5478f283-89c1-4093-aa9f-b3364a6506f6	32c0b219-e0ad-4ea2-b5ca-0b5edf2b9675	White converted the game	100	0	\N	\N	\N	\N	2026-06-24 09:30:34.888	2026-06-24 09:30:34.888
701619c0-f934-4895-bad8-02b9fff80f12	115f48c9-9ce0-4871-bd2c-c96c214974ee	White converted the game	100	0	\N	\N	\N	\N	2026-06-24 09:52:49.488	2026-06-24 09:52:49.488
5645bea0-b629-4adf-947b-d1494758362b	2e27e16c-50e1-4f3b-a305-98d69933d185	White converted the game	100	0	\N	\N	\N	\N	2026-06-24 10:13:04.164	2026-06-24 10:13:04.164
9c8883f3-15bb-40dd-8989-b7950e6723c6	6f3e13dc-7cbc-4209-943e-29dc5bdd00a0	Balanced draw	50	50	\N	\N	\N	\N	2026-06-25 17:13:57.319	2026-06-25 17:13:57.319
ff9a42d2-9135-4cb9-94f6-25c1901c771f	e5157207-f17f-4a54-98e9-057d50e52ccc	Balanced draw	50	50	\N	\N	\N	\N	2026-06-25 17:14:07.513	2026-06-25 17:14:07.513
07f1e177-6046-4c79-91d2-2b1c343d78e5	5300e559-9ae3-4de4-b585-fe84784659e1	Balanced draw	50	50	\N	\N	\N	\N	2026-06-25 17:20:07.833	2026-06-25 17:20:07.833
4020d6ba-c250-4586-baf6-95fca6f88ab7	063ef71a-1bd0-42f8-8a8a-5d333d92aa2f	Balanced draw	50	50	\N	\N	\N	\N	2026-06-25 17:22:22.355	2026-06-25 17:22:22.355
27abd455-f15d-4c27-b2c9-9c792fddbecf	7d8f6044-897b-46d4-966f-cb5f7964030e	Balanced draw	50	50	0	0	0	2026-06-25 19:14:19.702	2026-06-24 07:38:49.509	2026-06-25 19:14:19.703
86e71bd3-2664-4eaa-b62e-c68e4c4949c5	dcc39331-6658-4251-b554-95b204d9b188	White converted the game	100	0	66.6	0	33.3	2026-06-25 19:15:16.53	2026-06-24 05:50:11.247	2026-06-25 19:15:16.532
f7583e9b-3b0d-479b-8ec9-2af86827a3a1	368985f4-33bf-44df-acb3-4314861213a2	Balanced draw	50	50	0	0	0	2026-06-25 19:16:55.219	2026-06-23 18:34:13.586	2026-06-25 19:16:55.22
\.


--
-- Data for Name: GameState; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."GameState" (id, "gameId", "whitePlayerLeftTime", "blackPlayerLeftTime", increment, "timeSlot", "gameState", "gameMode", "isRated", "winnerId", "createdAt", "updatedAt") FROM stdin;
09575c2a-ac7d-4b1e-912c-5f1debc3bbdc	d07df430-4823-4908-a948-66faf97529b9	288	295	0		DRAW	standard	f	\N	2026-06-23 17:41:12.298	2026-06-23 17:41:12.298
d0a34955-5e56-496f-900c-7adf2aa948bf	7e28a67a-c6c6-4d30-bed8-6e1e6e3245ee	247	251	0		DRAW	standard	f	\N	2026-06-23 17:54:41.368	2026-06-23 17:54:41.368
6ce8c2af-ddb6-4224-8b55-89485a0ed1b2	0c6cda1c-fe64-418a-8c85-133c2c12439c	0	295	0		BLACK_WIN	chess960	f	d2077c67-d484-4a1d-928f-7a669c02fd0d	2026-06-23 18:29:55.665	2026-06-23 18:29:55.665
c1cc4d63-dd8f-4b5f-a46d-a3551d16462f	368985f4-33bf-44df-acb3-4314861213a2	225	229	0		DRAW	chess960	f	\N	2026-06-23 18:34:13.586	2026-06-23 18:34:13.586
f85bcdf6-bfd8-4c7c-8387-6e58edd11120	0ab0ddd2-8b71-454f-a7fb-53833eac9266	290	0	0		WHITE_WIN	chess960	f	bc772c22-2600-42ee-9e82-55a06398492e	2026-06-23 18:47:48.224	2026-06-23 18:47:48.224
eb368d6f-b2f2-48b9-9b77-3548dc910618	3381b55b-c32b-415e-a11a-386702508d7e	280	281	0		DRAW	standard	f	\N	2026-06-23 19:03:24.155	2026-06-23 19:03:24.155
5cfc2aa1-7363-43b1-82bf-f58161fcd182	46c5a68e-1f28-4667-993e-665d3dcd118c	300	300	0		DRAW	standard	f	\N	2026-06-23 19:10:11.764	2026-06-23 19:10:11.764
8a03df4d-f7c3-4d23-a6fb-023e1515da0d	7e27ee1b-7bc6-4db7-8578-0022aacdfd99	283	0	0		WHITE_WIN	chess960	f	bc772c22-2600-42ee-9e82-55a06398492e	2026-06-23 19:16:26.1	2026-06-23 19:16:26.1
7f354812-51a9-4a05-a069-7efbfe9c3a7d	ecda3a92-fc3e-4bc6-a141-2f9371c800b4	259	272	0		WHITE_WIN	chess960	f	bc772c22-2600-42ee-9e82-55a06398492e	2026-06-23 19:21:47.297	2026-06-23 19:21:47.297
4581c7e7-e7e4-4841-9e76-25815bd3dc3a	e4f0deb4-92dc-4ed9-9867-bd80804f4391	97	0	0		WHITE_WIN	chess960	f	bc772c22-2600-42ee-9e82-55a06398492e	2026-06-24 05:50:00.889	2026-06-24 05:50:00.889
2708b78d-898e-4127-9662-2fde451ff6d1	66ba4f9c-7696-4352-8562-ed0df058546c	0	300	0		BLACK_WIN	chess960	f	bc772c22-2600-42ee-9e82-55a06398492e	2026-06-24 05:50:05.645	2026-06-24 05:50:05.645
00142179-7ed5-4934-9f55-521a5606c526	dcc39331-6658-4251-b554-95b204d9b188	1	0	0		WHITE_WIN	standard	f	bc772c22-2600-42ee-9e82-55a06398492e	2026-06-24 05:50:11.247	2026-06-24 05:50:11.247
c054607c-2248-414e-af18-38981a41d298	480edd88-6f53-4673-9bb1-f75da664b910	274	282	0		BLACK_WIN	chess960	f	d2077c67-d484-4a1d-928f-7a669c02fd0d	2026-06-24 07:02:10.569	2026-06-24 07:02:10.569
35522beb-7106-4b79-9373-47e2e1c1e029	1ba570f0-9f45-4969-a470-c8f270e9cb7e	277	286	0		WHITE_WIN	chess960	f	bc772c22-2600-42ee-9e82-55a06398492e	2026-06-24 07:25:50.456	2026-06-24 07:25:50.456
c958c67e-7236-4a8f-ae2d-0be162dfcebf	7d8f6044-897b-46d4-966f-cb5f7964030e	132	211	0		DRAW	chess960	f	\N	2026-06-24 07:38:49.509	2026-06-24 07:38:49.509
ccd74b22-584e-4304-ac8c-5de1fc2b2660	32c0b219-e0ad-4ea2-b5ca-0b5edf2b9675	237	0	0		WHITE_WIN	chess960	f	bc772c22-2600-42ee-9e82-55a06398492e	2026-06-24 09:30:34.888	2026-06-24 09:30:34.888
65805d93-6e07-4630-8b00-130c2b7854cf	115f48c9-9ce0-4871-bd2c-c96c214974ee	57	0	0		WHITE_WIN	chess960	f	d2077c67-d484-4a1d-928f-7a669c02fd0d	2026-06-24 09:52:49.488	2026-06-24 09:52:49.488
e50da4a2-d21b-46e4-8836-fa51590256d7	2e27e16c-50e1-4f3b-a305-98d69933d185	261	0	0		WHITE_WIN	standard	f	bc772c22-2600-42ee-9e82-55a06398492e	2026-06-24 10:13:04.164	2026-06-24 10:13:04.164
6d6bd6d2-b891-4511-9dff-847cd3f34fed	6f3e13dc-7cbc-4209-943e-29dc5bdd00a0	283	293	0		DRAW	standard	f	\N	2026-06-25 17:13:57.319	2026-06-25 17:13:57.319
fb925b8a-d7b0-443d-ac91-5b74f27c4238	e5157207-f17f-4a54-98e9-057d50e52ccc	300	300	0		DRAW	standard	f	\N	2026-06-25 17:14:07.513	2026-06-25 17:14:07.513
416791bb-256c-4e23-9745-018c269b02e1	5300e559-9ae3-4de4-b585-fe84784659e1	300	300	0		DRAW	standard	f	\N	2026-06-25 17:20:07.833	2026-06-25 17:20:07.833
37cd0ec6-55ef-4674-8308-35a01a32f4ee	063ef71a-1bd0-42f8-8a8a-5d333d92aa2f	180	180	0		DRAW	standard	f	\N	2026-06-25 17:22:22.355	2026-06-25 17:22:22.355
\.


--
-- Data for Name: Match; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Match" (id, "tournamentId", "roundId", "groupId", "gameId", "scheduledAt", "isProcessed", "startedAt", "completedAt", "createdAt") FROM stdin;
ab913f91-e73f-4173-9b2a-f182da908b59	cmqrld7pe000h9zzlc8kmiro2	2a2f5112-e09c-4538-8277-7827ec62088f	b6290026-cc66-4102-87ef-d23946abaa7a	e4f0deb4-92dc-4ed9-9867-bd80804f4391	2026-06-24 04:55:03.199	t	\N	2026-06-24 05:50:00.889	2026-06-24 04:55:03.199
95fe7e9f-9211-477f-98b0-ef7f430082d6	cmqrld7pe000h9zzlc8kmiro2	2a2f5112-e09c-4538-8277-7827ec62088f	b6290026-cc66-4102-87ef-d23946abaa7a	66ba4f9c-7696-4352-8562-ed0df058546c	2026-06-24 04:55:03.199	t	\N	2026-06-24 05:50:05.645	2026-06-24 04:55:03.199
9dff597d-64d8-43d3-8410-8bf30889d6a1	cmqrufizd000g9zlhhvd10ppb	fbd40d57-4c21-4ee5-901b-2b01761e681e	68080a4b-e913-487e-a006-6f5b33b3eef3	32c0b219-e0ad-4ea2-b5ca-0b5edf2b9675	2026-06-24 09:09:03.106	t	\N	2026-06-24 09:30:34.888	2026-06-24 09:09:03.106
63943261-5392-4d89-85ba-fea133b5a801	cmqrufizd000g9zlhhvd10ppb	fbd40d57-4c21-4ee5-901b-2b01761e681e	68080a4b-e913-487e-a006-6f5b33b3eef3	115f48c9-9ce0-4871-bd2c-c96c214974ee	2026-06-24 09:09:03.106	t	\N	2026-06-24 09:52:49.488	2026-06-24 09:09:03.106
\.


--
-- Data for Name: Move; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Move" (id, "gameId", "playerId", "moveNumber", san, uci, "fenAfter", "fromSquare", "toSquare", promotion, "timeTakenMs", "createdAt") FROM stdin;
cf1b74af-9211-41cc-8645-38da63f643cf	d07df430-4823-4908-a948-66faf97529b9	bc772c22-2600-42ee-9e82-55a06398492e	1		f2f4	rnbqkbnr/pppppppp/8/8/5P2/8/PPPPP1PP/RNBQKBNR b KQkq - 0 1	f2	f4	q	11265	2026-06-23 17:41:12.298
564c5098-5683-4df6-83a9-46942e916538	d07df430-4823-4908-a948-66faf97529b9	d2077c67-d484-4a1d-928f-7a669c02fd0d	2		d7d5	rnbqkbnr/ppp1pppp/8/3p4/5P2/8/PPPPP1PP/RNBQKBNR w KQkq - 0 2	d7	d5	q	4225	2026-06-23 17:41:12.298
999f5845-ecd6-4612-8fd3-5d8663152b60	7e28a67a-c6c6-4d30-bed8-6e1e6e3245ee	bc772c22-2600-42ee-9e82-55a06398492e	1		d2d4	rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1	d2	d4	q	18735	2026-06-23 17:54:41.368
87e85188-1d50-4b67-b402-7f96552d3be9	7e28a67a-c6c6-4d30-bed8-6e1e6e3245ee	d2077c67-d484-4a1d-928f-7a669c02fd0d	2		e7e6	rnbqkbnr/pppp1ppp/4p3/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 2	e7	e6	q	19479	2026-06-23 17:54:41.368
e024751f-3c22-47ad-9f75-a15709c84d7c	7e28a67a-c6c6-4d30-bed8-6e1e6e3245ee	d2077c67-d484-4a1d-928f-7a669c02fd0d	3		c7c5	rnbqkbnr/pp1p1ppp/4p3/2p5/3P1P2/8/PPP1P1PP/RNBQKBNR w KQkq - 0 3	c7	c5	q	2660	2026-06-23 17:54:41.368
1d27ceab-5204-4149-ad11-93e82164fcb1	7e28a67a-c6c6-4d30-bed8-6e1e6e3245ee	d2077c67-d484-4a1d-928f-7a669c02fd0d	4		d7d5	rnbqkbnr/pp3ppp/4p3/2pp4/3P1P2/5N2/PPP1P1PP/RNBQKB1R w KQkq - 0 4	d7	d5	q	4459	2026-06-23 17:54:41.368
36899c61-0005-472f-a3bc-86591c77c6b8	7e28a67a-c6c6-4d30-bed8-6e1e6e3245ee	d2077c67-d484-4a1d-928f-7a669c02fd0d	5		d8a5	rnb1kbnr/pp3ppp/4p3/q1pp4/3P1P2/3Q1N2/PPP1P1PP/RNB1KB1R w KQkq - 2 5	d8	a5	q	6020	2026-06-23 17:54:41.368
46cbb68a-d69b-4404-87ac-d926af1087aa	7e28a67a-c6c6-4d30-bed8-6e1e6e3245ee	d2077c67-d484-4a1d-928f-7a669c02fd0d	6		a5b6	rnb1kbnr/pp3ppp/1q2p3/2pp4/3P1P2/3Q1N2/PPPBP1PP/RN2KB1R w KQkq - 4 6	a5	b6	q	5683	2026-06-23 17:54:41.368
86122c51-4865-46da-9dc3-02032675ec49	7e28a67a-c6c6-4d30-bed8-6e1e6e3245ee	d2077c67-d484-4a1d-928f-7a669c02fd0d	7		c5b4	rnb1kbnr/pp3ppp/1q2p3/3p4/1p1P1P2/3Q1N2/P1PBP1PP/RN2KB1R w KQkq - 0 7	c5	b4	q	4576	2026-06-23 17:54:41.368
8d3bb1b3-1d1f-478d-9342-f850ec77916b	7e28a67a-c6c6-4d30-bed8-6e1e6e3245ee	d2077c67-d484-4a1d-928f-7a669c02fd0d	8		b4b3	rnb1kbnr/pp3ppp/1q2p3/3p4/3P1P2/1pPQ1N2/P2BP1PP/RN2KB1R w KQkq - 0 8	b4	b3	q	5409	2026-06-23 17:54:41.368
784f0165-da28-44ce-936c-6a98dfeda45a	0c6cda1c-fe64-418a-8c85-133c2c12439c	bc772c22-2600-42ee-9e82-55a06398492e	1		f2f4	rqbnnkrb/pppppppp/8/8/5P2/8/PPPPP1PP/RQBNNKRB b KQkq - 0 1	f2	f4	q	265966	2026-06-23 18:29:55.665
dc3fb48b-3480-443f-ae51-1d4c22f039b8	0c6cda1c-fe64-418a-8c85-133c2c12439c	d2077c67-d484-4a1d-928f-7a669c02fd0d	2		d7d5	rqbnnkrb/ppp1pppp/8/3p4/5P2/8/PPPPP1PP/RQBNNKRB w KQkq - 0 2	d7	d5	q	4211	2026-06-23 18:29:55.665
de4f0df5-c458-47ea-9360-7624c3e1be75	368985f4-33bf-44df-acb3-4314861213a2	bc772c22-2600-42ee-9e82-55a06398492e	1		g2g4	bnrqkbrn/pppppppp/8/8/6P1/8/PPPPPP1P/BNRQKBRN b KQkq - 0 1	g2	g4	q	29459	2026-06-23 18:34:13.586
588452a6-2d8b-40b0-8354-df1f82550b49	368985f4-33bf-44df-acb3-4314861213a2	d2077c67-d484-4a1d-928f-7a669c02fd0d	2		c7c5	bnrqkbrn/pp1ppppp/8/2p5/6P1/8/PPPPPP1P/BNRQKBRN w KQkq - 0 2	c7	c5	q	4750	2026-06-23 18:34:13.586
5a8822ba-b00b-4583-b367-e09a987e4800	368985f4-33bf-44df-acb3-4314861213a2	d2077c67-d484-4a1d-928f-7a669c02fd0d	3		d8a5	bnr1kbrn/pp1ppppp/8/q1p5/6P1/6R1/PPPPPP1P/BNRQKB1N w KQkq - 2 3	d8	a5	q	4903	2026-06-23 18:34:13.586
a3d27895-f348-4dc6-94a1-78ffc091c452	368985f4-33bf-44df-acb3-4314861213a2	d2077c67-d484-4a1d-928f-7a669c02fd0d	4		d7d5	bnr1kbrn/pp2pppp/8/q1pp4/6P1/6R1/PPPPPPBP/BNRQK2N w KQkq - 0 4	d7	d5	q	14410	2026-06-23 18:34:13.586
eb3dc4ca-5cec-4364-bb0f-1bb472596c76	368985f4-33bf-44df-acb3-4314861213a2	d2077c67-d484-4a1d-928f-7a669c02fd0d	5		b8d7	b1r1kbrn/pp1npppp/8/q1pp4/6P1/4P1R1/PPPP1PBP/BNRQK2N w KQkq - 1 5	b8	d7	q	46363	2026-06-23 18:34:13.586
84ffe2b1-a5e4-4165-a98d-f9303093d757	0ab0ddd2-8b71-454f-a7fb-53833eac9266	bc772c22-2600-42ee-9e82-55a06398492e	1		f1g3	qbnrknbr/pppppppp/8/8/8/6N1/PPPPPPPP/QBNRK1BR b KQkq - 1 1	f1	g3	n	9691	2026-06-23 18:47:48.224
04272b1d-d417-474e-a1df-f1cf07785439	3381b55b-c32b-415e-a11a-386702508d7e	bc772c22-2600-42ee-9e82-55a06398492e	1		f2f4	rnbqkbnr/pppppppp/8/8/5P2/8/PPPPP1PP/RNBQKBNR b KQkq - 0 1	f2	f4	q	4739	2026-06-23 19:03:24.155
21e652d5-fe3a-4e63-9a80-e272eb461e28	3381b55b-c32b-415e-a11a-386702508d7e	d2077c67-d484-4a1d-928f-7a669c02fd0d	2		b7b5	rnbqkbnr/p1pppppp/8/1p6/5P2/8/PPPPP1PP/RNBQKBNR w KQkq - 0 2	b7	b5	q	2832	2026-06-23 19:03:24.155
9fe785ea-65ed-48f4-8c18-6e2bf6f36338	3381b55b-c32b-415e-a11a-386702508d7e	d2077c67-d484-4a1d-928f-7a669c02fd0d	3		b8c6	r1bqkbnr/p1pppppp/2n5/1p6/2P2P2/8/PP1PP1PP/RNBQKBNR w KQkq - 1 3	b8	c6	q	11668	2026-06-23 19:03:24.155
89e412e1-d196-4e7f-86dc-3ecd1093a95f	3381b55b-c32b-415e-a11a-386702508d7e	d2077c67-d484-4a1d-928f-7a669c02fd0d	4		f7f5	r1bqkbnr/p1ppp1pp/2n5/1p3p2/2P1PP2/8/PP1P2PP/RNBQKBNR w KQkq - 0 4	f7	f5	q	4382	2026-06-23 19:03:24.155
5d6c7d23-6089-4558-a7ff-32dcfd413e09	7e27ee1b-7bc6-4db7-8578-0022aacdfd99	bc772c22-2600-42ee-9e82-55a06398492e	1		f2f4	rqnnbbkr/pppppppp/8/8/5P2/8/PPPPP1PP/RQNNBBKR b KQkq - 0 1	f2	f4	q	5066	2026-06-23 19:16:26.1
dd16d559-c097-41ca-a39e-1e10f0dd93ce	7e27ee1b-7bc6-4db7-8578-0022aacdfd99	d2077c67-d484-4a1d-928f-7a669c02fd0d	2		b7b6	rqnnbbkr/p1pppppp/1p6/8/5P2/8/PPPPP1PP/RQNNBBKR w KQkq - 0 2	b7	b6	q	8216	2026-06-23 19:16:26.1
9b83cbee-a206-4939-a3f4-de13b8eacc66	7e27ee1b-7bc6-4db7-8578-0022aacdfd99	d2077c67-d484-4a1d-928f-7a669c02fd0d	3		c8d6	rq1nbbkr/p1pppppp/1p1n4/8/2P2P2/8/PP1PP1PP/RQNNBBKR w KQkq - 1 3	c8	d6	q	3396	2026-06-23 19:16:26.1
1f40b07d-90ec-47ac-852d-d4a4e3f056c6	7e27ee1b-7bc6-4db7-8578-0022aacdfd99	d2077c67-d484-4a1d-928f-7a669c02fd0d	4		c7c5	rq1nbbkr/p2ppppp/1p1n4/2p5/2P2P2/6B1/PP1PP1PP/RQNN1BKR w KQkq - 0 4	c7	c5	q	3565	2026-06-23 19:16:26.1
132e8e45-0263-4f56-8300-ec167a835144	ecda3a92-fc3e-4bc6-a141-2f9371c800b4	bc772c22-2600-42ee-9e82-55a06398492e	1		f2f4	qrbnkbnr/pppppppp/8/8/5P2/8/PPPPP1PP/QRBNKBNR b KQkq - 0 1	f2	f4	q	12393	2026-06-23 19:21:47.297
12b48527-5805-4933-87a8-4ef734e57700	ecda3a92-fc3e-4bc6-a141-2f9371c800b4	d2077c67-d484-4a1d-928f-7a669c02fd0d	2		b7b5	qrbnkbnr/p1pppppp/8/1p6/5P2/8/PPPPP1PP/QRBNKBNR w KQkq - 0 2	b7	b5	q	2874	2026-06-23 19:21:47.297
3ab8e1bd-04fa-4757-9872-a35a95d0bcac	ecda3a92-fc3e-4bc6-a141-2f9371c800b4	d2077c67-d484-4a1d-928f-7a669c02fd0d	3		c8a6	qr1nkbnr/p1pppppp/b7/1p6/5P2/4N3/PPPPP1PP/QRB1KBNR w KQkq - 2 3	c8	a6	q	3841	2026-06-23 19:21:47.297
82b16463-efd5-478a-b3fa-99f4f66814c5	ecda3a92-fc3e-4bc6-a141-2f9371c800b4	d2077c67-d484-4a1d-928f-7a669c02fd0d	4		d7d5	qr1nkbnr/p1p1pppp/b7/1p1p4/5P2/4NN2/PPPPP1PP/QRB1KB1R w KQkq - 0 4	d7	d5	q	3081	2026-06-23 19:21:47.297
edbf2efe-cc8a-447e-bc26-04961e9bc83c	ecda3a92-fc3e-4bc6-a141-2f9371c800b4	d2077c67-d484-4a1d-928f-7a669c02fd0d	5		c7c5	qr1nkbnr/p3pppp/b7/1ppN4/5P2/5N2/PPPPP1PP/QRB1KB1R w KQkq - 0 5	c7	c5	q	4763	2026-06-23 19:21:47.297
132ca62d-c8c7-4e16-8873-81db699d3793	ecda3a92-fc3e-4bc6-a141-2f9371c800b4	d2077c67-d484-4a1d-928f-7a669c02fd0d	6		c5d4	qr1nkbnr/p3pppp/b7/1p1N4/3p1P2/8/PPPPP1PP/QRB1KB1R w KQkq - 0 6	c5	d4	q	3270	2026-06-23 19:21:47.297
63bc4d61-41b5-40b3-b281-56c6aaeaeb8d	ecda3a92-fc3e-4bc6-a141-2f9371c800b4	d2077c67-d484-4a1d-928f-7a669c02fd0d	7		e7e6	qr1nkbnr/p4ppp/b3p3/1p1N4/3p1P2/3P4/PPP1P1PP/QRB1KB1R w KQkq - 0 7	e7	e6	q	7323	2026-06-23 19:21:47.297
abc73226-3c6c-4cc8-a5da-eb12b89846b7	ecda3a92-fc3e-4bc6-a141-2f9371c800b4	d2077c67-d484-4a1d-928f-7a669c02fd0d	8		e6d5	qr1nkbnr/p4ppp/b7/1p1p4/3pPP2/3P4/PPP3PP/QRB1KB1R w KQkq - 0 8	e6	d5	q	2669	2026-06-23 19:21:47.297
f6f7c27a-3856-4b1b-b5c2-6999dd58545d	e4f0deb4-92dc-4ed9-9867-bd80804f4391	bc772c22-2600-42ee-9e82-55a06398492e	1		e2e4	rnqbbnkr/pppppppp/8/8/4P3/8/PPPP1PPP/RNQBBNKR b KQkq - 0 1	e2	e4	q	202156	2026-06-24 05:50:00.889
0f1d5361-af0e-4f8d-978a-ed9200e66f9c	dcc39331-6658-4251-b554-95b204d9b188	bc772c22-2600-42ee-9e82-55a06398492e	1		d2d4	rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1	d2	d4	q	7459	2026-06-24 05:50:11.247
fcf4b4f8-c238-4310-bfe5-6d1a94ac0d58	dcc39331-6658-4251-b554-95b204d9b188	d2077c67-d484-4a1d-928f-7a669c02fd0d	2		e7e5	rnbqkbnr/pppp1ppp/8/4p3/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 2	e7	e5	q	3082	2026-06-24 05:50:11.247
faa2c324-4fb6-4a56-b074-af128a9cd7fb	dcc39331-6658-4251-b554-95b204d9b188	d2077c67-d484-4a1d-928f-7a669c02fd0d	3		c7c5	rnbqkbnr/pp1p1ppp/8/2p1p3/3P4/5N2/PPP1PPPP/RNBQKB1R w KQkq - 0 3	c7	c5	q	4176	2026-06-24 05:50:11.247
008ce043-0b39-4a4f-88e3-b79962d60b1e	dcc39331-6658-4251-b554-95b204d9b188	d2077c67-d484-4a1d-928f-7a669c02fd0d	4		d7d5	rnbqkbnr/pp3ppp/8/2ppp3/3P4/4PN2/PPP2PPP/RNBQKB1R w KQkq - 0 4	d7	d5	q	4858	2026-06-24 05:50:11.247
a349fd47-869c-41a0-aa17-5bc762e60470	dcc39331-6658-4251-b554-95b204d9b188	d2077c67-d484-4a1d-928f-7a669c02fd0d	5		f7f6	rnbqkbnr/pp4pp/5p2/2ppp3/3P4/3BPN2/PPP2PPP/RNBQK2R w KQkq - 0 5	f7	f6	q	3390	2026-06-24 05:50:11.247
cd4435e2-f6a6-411a-b746-b5f215cc9db6	dcc39331-6658-4251-b554-95b204d9b188	d2077c67-d484-4a1d-928f-7a669c02fd0d	6		b7b5	rnbqkbnr/p5pp/5p2/1pppp3/3P4/3BPN2/PPP2PPP/RNBQ1RK1 w kq - 0 6	b7	b5	q	5351	2026-06-24 05:50:11.247
df1354c4-6f71-460d-b892-8fb583836146	dcc39331-6658-4251-b554-95b204d9b188	d2077c67-d484-4a1d-928f-7a669c02fd0d	7		f6e5	rnbqkbnr/p5pp/8/1pppp3/8/3BPN2/PPP2PPP/RNBQ1RK1 w kq - 0 7	f6	e5	q	4174	2026-06-24 05:50:11.247
b45fd857-bf25-46fb-9547-fce073515e7b	dcc39331-6658-4251-b554-95b204d9b188	d2077c67-d484-4a1d-928f-7a669c02fd0d	8		d8d6	rnb1kbnr/p5pp/3q4/1pppN3/8/3BP3/PPP2PPP/RNBQ1RK1 w kq - 1 8	d8	d6	q	4729	2026-06-24 05:50:11.247
f237139d-0705-48ea-8580-bab04fd6b346	dcc39331-6658-4251-b554-95b204d9b188	d2077c67-d484-4a1d-928f-7a669c02fd0d	9		c8d7	rn2kbnr/p2b2pp/3q4/1BppN3/8/4P3/PPP2PPP/RNBQ1RK1 w kq - 1 9	c8	d7	q	9091	2026-06-24 05:50:11.247
ae89ed57-e20c-4ce7-bbb0-3add7b27fd65	dcc39331-6658-4251-b554-95b204d9b188	d2077c67-d484-4a1d-928f-7a669c02fd0d	10		b8c6	r3kbnr/p2b2pp/2nq4/1BppN3/6Q1/4P3/PPP2PPP/RNB2RK1 w kq - 3 10	b8	c6	q	9713	2026-06-24 05:50:11.247
53ad7527-c2b4-4d20-8e87-d04e4e297515	dcc39331-6658-4251-b554-95b204d9b188	d2077c67-d484-4a1d-928f-7a669c02fd0d	11		g7g6	r3kbnr/p2b3p/2nq2p1/1BppN2Q/8/4P3/PPP2PPP/RNB2RK1 w kq - 0 11	g7	g6	q	9763	2026-06-24 05:50:11.247
c9ece35c-c1b4-4a59-b84c-83f6a2c27806	dcc39331-6658-4251-b554-95b204d9b188	d2077c67-d484-4a1d-928f-7a669c02fd0d	12		c6e5	r3kbnr/p2b3p/3q2p1/1Bppn3/7Q/4P3/PPP2PPP/RNB2RK1 w kq - 0 12	c6	e5	q	3758	2026-06-24 05:50:11.247
f83c299a-13b2-40ce-af6c-1e65264568d9	dcc39331-6658-4251-b554-95b204d9b188	d2077c67-d484-4a1d-928f-7a669c02fd0d	13		e5d7	r3kbnr/p2n3p/3q2p1/2pp4/7Q/4P3/PPP2PPP/RNB2RK1 w kq - 0 13	e5	d7	q	6798	2026-06-24 05:50:11.247
86e6380c-c7a4-42aa-9a03-a7756088e682	dcc39331-6658-4251-b554-95b204d9b188	d2077c67-d484-4a1d-928f-7a669c02fd0d	14		a8b8	1r2kbnr/p2n3p/3q2p1/2pp4/5P1Q/4P3/PPP3PP/RNB2RK1 w k - 1 14	a8	b8	q	3357	2026-06-24 05:50:11.247
747033f8-c08d-4bdf-b6b8-8a779cff59d1	dcc39331-6658-4251-b554-95b204d9b188	d2077c67-d484-4a1d-928f-7a669c02fd0d	15		g8e7	1r2kb1r/p2nn2p/3q2p1/2pp1P2/7Q/4P3/PPP3PP/RNB2RK1 w k - 1 15	g8	e7	q	7465	2026-06-24 05:50:11.247
a8a38241-9914-4ef9-b8d8-430634181d0b	dcc39331-6658-4251-b554-95b204d9b188	d2077c67-d484-4a1d-928f-7a669c02fd0d	16		e7f5	1r2kb1r/p2n3p/3q1Pp1/2pp1n2/7Q/4P3/PPP3PP/RNB2RK1 w k - 1 16	e7	f5	q	13003	2026-06-24 05:50:11.247
810938f1-38bb-4200-8eca-7062abed8bae	dcc39331-6658-4251-b554-95b204d9b188	d2077c67-d484-4a1d-928f-7a669c02fd0d	17		d7f6	1r2kb1r/p6p/3q1np1/2pp1nQ1/8/4P3/PPP3PP/RNB2RK1 w k - 0 17	d7	f6	q	17181	2026-06-24 05:50:11.247
23d90093-dc46-450d-a6d6-dc46ec8dcfd9	dcc39331-6658-4251-b554-95b204d9b188	d2077c67-d484-4a1d-928f-7a669c02fd0d	18		d6e6	1r2kb1r/p6p/4qnp1/2pp1nQ1/8/2N1P3/PPP3PP/R1B2RK1 w k - 2 18	d6	e6	q	9358	2026-06-24 05:50:11.247
00f29a17-de1e-4e50-9d4e-8876e98e8398	dcc39331-6658-4251-b554-95b204d9b188	d2077c67-d484-4a1d-928f-7a669c02fd0d	19		b8b2	4kb1r/p6p/4qnp1/2pp1nQ1/8/2N1P3/PrPB2PP/R4RK1 w k - 0 19	b8	b2	q	5189	2026-06-24 05:50:11.247
37f42d04-0bc0-4ff5-8e34-8b66c47e11dc	dcc39331-6658-4251-b554-95b204d9b188	d2077c67-d484-4a1d-928f-7a669c02fd0d	20		b2c2	4kb1r/p6p/4qnp1/2pp1nQ1/8/2N1P3/P1rB2PP/4RRK1 w k - 0 20	b2	c2	q	5915	2026-06-24 05:50:11.247
9a5eae8b-a598-4500-bcfb-2b69fa11ba46	dcc39331-6658-4251-b554-95b204d9b188	d2077c67-d484-4a1d-928f-7a669c02fd0d	21		d5d4	4kb1r/p6p/4qnp1/2p2nQ1/3p4/2N1P3/P1rBR1PP/5RK1 w k - 0 21	d5	d4	q	6085	2026-06-24 05:50:11.247
4a7211d8-716a-4885-b9b6-bdad68d8ad71	dcc39331-6658-4251-b554-95b204d9b188	d2077c67-d484-4a1d-928f-7a669c02fd0d	22		e6e2	4kb1r/p6p/5np1/2p2nQ1/3P4/2N5/P1rBq1PP/5RK1 w k - 0 22	e6	e2	q	9750	2026-06-24 05:50:11.247
7f5dc23f-9565-4f32-a6d8-847570b0205c	dcc39331-6658-4251-b554-95b204d9b188	d2077c67-d484-4a1d-928f-7a669c02fd0d	23		c2a2	4kb1r/p6p/5np1/2p2nQ1/3P4/8/r2BN1PP/5RK1 w k - 0 23	c2	a2	q	12900	2026-06-24 05:50:11.247
5df8ff08-348e-41d9-8ad2-040e368a8986	dcc39331-6658-4251-b554-95b204d9b188	d2077c67-d484-4a1d-928f-7a669c02fd0d	24		h8g8	4kbr1/p6p/5Qp1/2p2n2/3P4/8/r2BN1PP/5RK1 w - - 1 24	h8	g8	q	9979	2026-06-24 05:50:11.247
89d09963-2ea4-4c36-89b9-da71f721393b	dcc39331-6658-4251-b554-95b204d9b188	d2077c67-d484-4a1d-928f-7a669c02fd0d	25		f8e7	4k1r1/p3b2p/4Q1p1/2p2n2/3P4/8/r2BN1PP/5RK1 w - - 3 25	f8	e7	q	6919	2026-06-24 05:50:11.247
21433e39-b939-4da7-bc68-4ca3e6e59bb8	dcc39331-6658-4251-b554-95b204d9b188	d2077c67-d484-4a1d-928f-7a669c02fd0d	26		e8f7	6r1/p3bk1p/2Q3p1/2p2n2/3P4/8/r2BN1PP/5RK1 w - - 5 26	e8	f7	q	3411	2026-06-24 05:50:11.247
cce36cab-f04c-410f-82af-2cffce7b5c9b	dcc39331-6658-4251-b554-95b204d9b188	d2077c67-d484-4a1d-928f-7a669c02fd0d	27		c5c4	6r1/p3bk1p/2Q3p1/3P1n2/2p5/8/r2BN1PP/5RK1 w - - 0 27	c5	c4	q	2751	2026-06-24 05:50:11.247
1675249f-7c90-40b1-8c58-9e1b08e3edcb	dcc39331-6658-4251-b554-95b204d9b188	d2077c67-d484-4a1d-928f-7a669c02fd0d	28		c4c3	6r1/p3bk1p/2QP2p1/5n2/8/2p5/r2BN1PP/5RK1 w - - 0 28	c4	c3	q	2568	2026-06-24 05:50:11.247
4912d90b-cc52-42ec-be63-9e69cf8f37db	dcc39331-6658-4251-b554-95b204d9b188	d2077c67-d484-4a1d-928f-7a669c02fd0d	29		c3c2	6r1/p2Pbk1p/2Q3p1/5n2/8/8/r1pBN1PP/5RK1 w - - 0 29	c3	c2	q	4439	2026-06-24 05:50:11.247
87166acb-91cc-42ff-81f6-c3746c3b95ce	dcc39331-6658-4251-b554-95b204d9b188	d2077c67-d484-4a1d-928f-7a669c02fd0d	30		c2c1	3R2r1/p3bk1p/2Q3p1/5n2/8/8/r2BN1PP/2q2RK1 w - - 0 30	c2	c1	q	7925	2026-06-24 05:50:11.247
8bcb6328-36a4-4cce-8715-aeabcc51f765	dcc39331-6658-4251-b554-95b204d9b188	d2077c67-d484-4a1d-928f-7a669c02fd0d	31		a2a5	3R2r1/p3bk1p/2Q3p1/r4n2/8/8/3BN1PP/2R3K1 w - - 1 31	a2	a5	q	9995	2026-06-24 05:50:11.247
3937ed9f-e3a2-4016-a64a-12efcd5b28be	dcc39331-6658-4251-b554-95b204d9b188	d2077c67-d484-4a1d-928f-7a669c02fd0d	32		f7g8	6k1/p3b2p/2Q3p1/r4n2/8/8/3BN1PP/2R3K1 w - - 0 32	f7	g8	q	4089	2026-06-24 05:50:11.247
78d08380-2eb2-473e-ae2a-3ef180ee3da7	dcc39331-6658-4251-b554-95b204d9b188	d2077c67-d484-4a1d-928f-7a669c02fd0d	33		e7f8	2Q2bk1/p6p/6p1/r4n2/8/8/3BN1PP/2R3K1 w - - 2 33	e7	f8	q	3091	2026-06-24 05:50:11.247
88b994d6-17b3-4f94-8dcd-75dbf9fef060	dcc39331-6658-4251-b554-95b204d9b188	d2077c67-d484-4a1d-928f-7a669c02fd0d	34		f5e7	2Q2bk1/p1R1n2p/6p1/r7/8/8/3BN1PP/6K1 w - - 4 34	f5	e7	q	6442	2026-06-24 05:50:11.247
fef4c605-c7e1-41b6-88ae-46bb081c18e9	dcc39331-6658-4251-b554-95b204d9b188	d2077c67-d484-4a1d-928f-7a669c02fd0d	35		g8g7	5b2/p1R1n1kp/4Q1p1/r7/8/8/3BN1PP/6K1 w - - 6 35	g8	g7	q	17058	2026-06-24 05:50:11.247
538512be-6d5f-4e93-bd56-366be112362b	dcc39331-6658-4251-b554-95b204d9b188	d2077c67-d484-4a1d-928f-7a669c02fd0d	36		a5f5	5b2/p1R1n1kp/4Q1p1/5rB1/8/8/4N1PP/6K1 w - - 8 36	a5	f5	q	10612	2026-06-24 05:50:11.247
fd2c6e3e-5601-45e5-b435-84515ef58eae	dcc39331-6658-4251-b554-95b204d9b188	d2077c67-d484-4a1d-928f-7a669c02fd0d	37		f8e7	8/p1R1b1kp/4Q1p1/5r2/8/8/4N1PP/6K1 w - - 0 37	f8	e7	q	4086	2026-06-24 05:50:11.247
e7c7c02e-4419-41b1-8cc2-ab191b8d2d16	dcc39331-6658-4251-b554-95b204d9b188	d2077c67-d484-4a1d-928f-7a669c02fd0d	38		g7h6	8/p3R2p/4Q1pk/5r2/8/8/4N1PP/6K1 w - - 1 38	g7	h6	q	4641	2026-06-24 05:50:11.247
82141c37-9791-4666-9f76-63caf1e6e8a5	dcc39331-6658-4251-b554-95b204d9b188	d2077c67-d484-4a1d-928f-7a669c02fd0d	39		g6g5	8/p3R2p/7k/5rp1/8/4Q3/4N1PP/6K1 w - - 0 39	g6	g5	q	38249	2026-06-24 05:50:11.247
2494f260-b04e-4efb-a06b-79a3dc7b4a3a	480edd88-6f53-4673-9bb1-f75da664b910	bc772c22-2600-42ee-9e82-55a06398492e	1		e2e4	nrbbnkrq/pppppppp/8/8/4P3/8/PPPP1PPP/NRBBNKRQ b KQkq - 0 1	e2	e4	q	4150	2026-06-24 07:02:10.569
1066432d-ffbb-41da-a62d-1670639f2301	480edd88-6f53-4673-9bb1-f75da664b910	d2077c67-d484-4a1d-928f-7a669c02fd0d	2		c7c5	nrbbnkrq/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/NRBBNKRQ w KQkq - 0 2	c7	c5	q	2736	2026-06-24 07:02:10.569
a6f5f63e-e252-4bde-ad9f-336c7f90d46d	480edd88-6f53-4673-9bb1-f75da664b910	d2077c67-d484-4a1d-928f-7a669c02fd0d	3		e8f6	nrbb1krq/pp1ppppp/5n2/2p5/4P3/3N4/PPPP1PPP/NRBB1KRQ w KQkq - 2 3	e8	f6	q	3339	2026-06-24 07:02:10.569
4676e779-23db-49ec-b471-b6fefb1f29de	480edd88-6f53-4673-9bb1-f75da664b910	d2077c67-d484-4a1d-928f-7a669c02fd0d	4		g7g6	nrbb1krq/pp1ppp1p/5np1/2p5/4P3/3N2P1/PPPP1P1P/NRBB1KRQ w KQkq - 0 4	g7	g6	q	6010	2026-06-24 07:02:10.569
06d140db-6d87-4592-acfc-6f6aeb97afdd	480edd88-6f53-4673-9bb1-f75da664b910	d2077c67-d484-4a1d-928f-7a669c02fd0d	5		h8g7	nrbb1kr1/pp1pppqp/5np1/2p5/4P3/3N2P1/PPPP1PQP/NRBB1KR1 w KQkq - 2 5	h8	g7	q	5687	2026-06-24 07:02:10.569
0066034b-e253-43dc-938f-8af4f594f90f	1ba570f0-9f45-4969-a470-c8f270e9cb7e	bc772c22-2600-42ee-9e82-55a06398492e	1		f2f4	nbbrknrq/pppppppp/8/8/5P2/8/PPPPP1PP/NBBRKNRQ b KQkq - 0 1	f2	f4	q	4986	2026-06-24 07:25:50.456
50c5ed5b-f53a-4034-bcf1-e126913b4491	1ba570f0-9f45-4969-a470-c8f270e9cb7e	d2077c67-d484-4a1d-928f-7a669c02fd0d	2		b7b5	nbbrknrq/p1pppppp/8/1p6/5P2/8/PPPPP1PP/NBBRKNRQ w KQkq - 0 2	b7	b5	q	2695	2026-06-24 07:25:50.456
f310d8f4-dcf9-4d17-a808-e2fed0591782	1ba570f0-9f45-4969-a470-c8f270e9cb7e	d2077c67-d484-4a1d-928f-7a669c02fd0d	3		e7e5	nbbrknrq/p1pp1ppp/8/1p2p3/5P2/4N3/PPPPP1PP/NBBRK1RQ w KQkq - 0 3	e7	e5	q	4372	2026-06-24 07:25:50.456
584fcc75-99fc-441a-b21f-3c0851630086	1ba570f0-9f45-4969-a470-c8f270e9cb7e	d2077c67-d484-4a1d-928f-7a669c02fd0d	4		d7d5	nbbrknrq/p1p2ppp/8/1p1pp3/5P2/4N1P1/PPPPP2P/NBBRK1RQ w KQkq - 0 4	d7	d5	q	3440	2026-06-24 07:25:50.456
3a4671d9-8982-4b07-b914-9bf56b5b6599	1ba570f0-9f45-4969-a470-c8f270e9cb7e	d2077c67-d484-4a1d-928f-7a669c02fd0d	5		c7c6	nbbrknrq/p4ppp/2p5/1p1pp3/5P2/4N1P1/PPPPP1QP/NBBRK1R1 w KQkq - 0 5	c7	c6	q	2987	2026-06-24 07:25:50.456
3279e1a3-b75f-4113-9a85-b30de9c453c4	7d8f6044-897b-46d4-966f-cb5f7964030e	bc772c22-2600-42ee-9e82-55a06398492e	1		d2d4	rkrnnbbq/pppppppp/8/8/3P4/8/PPP1PPPP/RKRNNBBQ b KQkq - 0 1	d2	d4	q	16203	2026-06-24 07:38:49.509
17f001cb-ff2d-4e46-9641-3e3f9e746c8b	7d8f6044-897b-46d4-966f-cb5f7964030e	d2077c67-d484-4a1d-928f-7a669c02fd0d	2		d7d5	rkrnnbbq/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RKRNNBBQ w KQkq - 0 2	d7	d5	q	2631	2026-06-24 07:38:49.509
4fa4484d-f151-49d6-879a-d6745fa34a01	7d8f6044-897b-46d4-966f-cb5f7964030e	d2077c67-d484-4a1d-928f-7a669c02fd0d	3		d8c6	rkr1nbbq/ppp1pppp/2n5/3p4/3P4/2N5/PPP1PPPP/RKR1NBBQ w KQkq - 2 3	d8	c6	q	7363	2026-06-24 07:38:49.509
b937b19d-6703-4e31-a72e-931b96734ae5	7d8f6044-897b-46d4-966f-cb5f7964030e	d2077c67-d484-4a1d-928f-7a669c02fd0d	4		c8d8	rk1rnbbq/ppp1pppp/2n5/3p4/3P4/2N5/PPP1PPPP/RK1RNBBQ w Qq - 4 4	c8	d8	q	4155	2026-06-24 07:38:49.509
2a770619-2e00-4c77-a19d-945aaa2dc761	7d8f6044-897b-46d4-966f-cb5f7964030e	d2077c67-d484-4a1d-928f-7a669c02fd0d	5		b8c8	r1krnbbq/ppp1pppp/2n5/3p4/3P4/1PN5/P1P1PPPP/RK1RNBBQ w Q - 1 5	b8	c8	q	6053	2026-06-24 07:38:49.509
75238d29-9524-46cd-8348-2665bf1a4a20	7d8f6044-897b-46d4-966f-cb5f7964030e	d2077c67-d484-4a1d-928f-7a669c02fd0d	6		d8d6	r1k1nbbq/ppp1pppp/2nr4/3p4/3P4/1PN5/PKP1PPPP/R2RNBBQ w - - 3 6	d8	d6	r	12560	2026-06-24 07:38:49.509
1e41f136-1896-4bbd-83f1-3cb574c8ebef	7d8f6044-897b-46d4-966f-cb5f7964030e	d2077c67-d484-4a1d-928f-7a669c02fd0d	7		e8f6	r1k2bbq/ppp1pppp/2nr1n2/3p4/3P4/1PNR4/PKP1PPPP/R3NBBQ w - - 5 7	e8	f6	q	11653	2026-06-24 07:38:49.509
ca42d016-7f02-4935-9467-7ca97034bf29	7d8f6044-897b-46d4-966f-cb5f7964030e	d2077c67-d484-4a1d-928f-7a669c02fd0d	8		f6e4	r1k2bbq/ppp1pppp/2nr4/3p4/3PnP2/1PNR4/PKP1P1PP/R3NBBQ w - - 1 8	f6	e4	q	9901	2026-06-24 07:38:49.509
e8846dbf-5da9-4980-8947-5a804387e9cf	7d8f6044-897b-46d4-966f-cb5f7964030e	d2077c67-d484-4a1d-928f-7a669c02fd0d	9		d5e4	r1k2bbq/ppp1pppp/2nr4/8/3PpP2/1P1R4/PKP1P1PP/R3NBBQ w - - 0 9	d5	e4	q	6866	2026-06-24 07:38:49.509
37f3b631-a95a-4cfc-8fa9-a9a119a96458	7d8f6044-897b-46d4-966f-cb5f7964030e	d2077c67-d484-4a1d-928f-7a669c02fd0d	10		c6d4	r1k2bbq/ppp1pppp/3r4/8/3npP2/1P6/PKP1P1PP/R2RNBBQ w - - 0 10	c6	d4	q	17147	2026-06-24 07:38:49.509
55b02494-d2b0-4887-81fa-13257ef15f74	7d8f6044-897b-46d4-966f-cb5f7964030e	d2077c67-d484-4a1d-928f-7a669c02fd0d	11		d6d4	r1k2bbq/ppp1pppp/8/8/3rpP2/1P6/PKP1P1PP/R2RNB1Q w - - 0 11	d6	d4	q	10554	2026-06-24 07:38:49.509
df13b78e-26fe-4a53-9df3-47be3b4afb33	32c0b219-e0ad-4ea2-b5ca-0b5edf2b9675	bc772c22-2600-42ee-9e82-55a06398492e	1		d2d4	rqnnbbkr/pppppppp/8/8/3P4/8/PPP1PPPP/RQNNBBKR b KQkq - 0 1	d2	d4	q	11997	2026-06-24 09:30:34.888
3ca52085-682f-4d28-9ec6-a6c0e91d6e6f	32c0b219-e0ad-4ea2-b5ca-0b5edf2b9675	d2077c67-d484-4a1d-928f-7a669c02fd0d	2		e7e5	rqnnbbkr/pppp1ppp/8/4p3/3P4/8/PPP1PPPP/RQNNBBKR w KQkq - 0 2	e7	e5	q	4526	2026-06-24 09:30:34.888
92d602be-3bdb-42dd-a1db-213e108ca751	32c0b219-e0ad-4ea2-b5ca-0b5edf2b9675	d2077c67-d484-4a1d-928f-7a669c02fd0d	3		c8d6	rq1nbbkr/pppp1ppp/3n4/4p3/3P1P2/8/PPP1P1PP/RQNNBBKR w KQkq - 1 3	c8	d6	q	3544	2026-06-24 09:30:34.888
1f2fb133-53a8-4f76-a159-b60dfe0f02ca	32c0b219-e0ad-4ea2-b5ca-0b5edf2b9675	d2077c67-d484-4a1d-928f-7a669c02fd0d	4		c7c6	rq1nbbkr/pp1p1ppp/2pn4/4p3/3P1P2/1N6/PPP1P1PP/RQ1NBBKR w KQkq - 0 4	c7	c6	q	6526	2026-06-24 09:30:34.888
d24caa58-4d9e-415e-90e6-3abb2f4f5400	32c0b219-e0ad-4ea2-b5ca-0b5edf2b9675	d2077c67-d484-4a1d-928f-7a669c02fd0d	5		d6e4	rq1nbbkr/pp1p1ppp/2p5/4p3/3PnP2/1N6/PPP3PP/RQ1NBBKR w KQkq - 0 5	d6	e4	q	7791	2026-06-24 09:30:34.888
54e7fe5a-b179-4cdb-8fcc-a092cb130a4e	32c0b219-e0ad-4ea2-b5ca-0b5edf2b9675	d2077c67-d484-4a1d-928f-7a669c02fd0d	6		d7d5	rq1nbbkr/pp3ppp/2p5/3pp3/3PnP2/1N6/PPP3PP/R1QNBBKR w KQkq - 0 6	d7	d5	q	4202	2026-06-24 09:30:34.888
33d18c96-950b-41ec-8767-bc6473781e7e	32c0b219-e0ad-4ea2-b5ca-0b5edf2b9675	d2077c67-d484-4a1d-928f-7a669c02fd0d	7		d8e6	rq2bbkr/pp3ppp/2p1n3/3pp3/3PnP2/1N1B4/PPP3PP/R1QNB1KR w KQkq - 2 7	d8	e6	q	7706	2026-06-24 09:30:34.888
2e42551a-8939-471d-b6c5-adf44f4dfcf9	32c0b219-e0ad-4ea2-b5ca-0b5edf2b9675	d2077c67-d484-4a1d-928f-7a669c02fd0d	8		d5e4	rq2bbkr/pp3ppp/2p1n3/4p3/3PpP2/1N6/PPP3PP/R1QNB1KR w KQkq - 0 8	d5	e4	q	4490	2026-06-24 09:30:34.888
441935f8-9502-4ef8-a4b2-7ed7d8b6ce9b	115f48c9-9ce0-4871-bd2c-c96c214974ee	d2077c67-d484-4a1d-928f-7a669c02fd0d	1		d2d4	rqnnbbkr/pppppppp/8/8/3P4/8/PPP1PPPP/RQNNBBKR b KQkq - 0 1	d2	d4	q	0	2026-06-24 09:52:49.488
4fa1bcef-6f7b-44cf-8849-6e5abe8b3e42	115f48c9-9ce0-4871-bd2c-c96c214974ee	bc772c22-2600-42ee-9e82-55a06398492e	2		d7d5	rqnnbbkr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RQNNBBKR w KQkq - 0 2	d7	d5	q	4167	2026-06-24 09:52:49.488
c23e9e0d-18f2-4b1d-8e5b-1b19fd806add	115f48c9-9ce0-4871-bd2c-c96c214974ee	bc772c22-2600-42ee-9e82-55a06398492e	3		e7e6	rqnnbbkr/ppp2ppp/4p3/3p4/3P4/4P3/PPP2PPP/RQNNBBKR w KQkq - 0 3	e7	e6	q	2433	2026-06-24 09:52:49.488
dd20e824-e0e3-4b1a-a8f5-eb5eac8d5bd6	115f48c9-9ce0-4871-bd2c-c96c214974ee	bc772c22-2600-42ee-9e82-55a06398492e	4		f8e7	rqnnb1kr/ppp1bppp/4p3/3p4/3P4/4P3/PPP1BPPP/RQNNB1KR w KQkq - 2 4	f8	e7	q	3880	2026-06-24 09:52:49.488
f4be591d-f3b9-49de-a77d-cfb20069097b	115f48c9-9ce0-4871-bd2c-c96c214974ee	bc772c22-2600-42ee-9e82-55a06398492e	5		c8d6	rq1nb1kr/ppp1bppp/3np3/3p4/3P4/3NP3/PPP1BPPP/RQ1NB1KR w KQkq - 4 5	c8	d6	q	8981	2026-06-24 09:52:49.488
6fbea7aa-234d-41cb-8036-064cb39ede2b	115f48c9-9ce0-4871-bd2c-c96c214974ee	bc772c22-2600-42ee-9e82-55a06398492e	6		g8h8	rq1nbrk1/ppp1bppp/3np3/3p4/3P4/3NP3/PPP1BPPP/RQ1NBRK1 w - - 6 6	g8	h8	q	21234	2026-06-24 09:52:49.488
e836ff06-636c-439c-a633-4903b7dbf025	115f48c9-9ce0-4871-bd2c-c96c214974ee	bc772c22-2600-42ee-9e82-55a06398492e	7		b7b5	rq1nbrk1/p1p1bppp/3np3/1p1p4/3P1P2/3NP3/PPP1B1PP/RQ1NBRK1 w - - 0 7	b7	b5	q	26535	2026-06-24 09:52:49.488
262c9256-21f9-4436-9712-f5148ee53586	115f48c9-9ce0-4871-bd2c-c96c214974ee	bc772c22-2600-42ee-9e82-55a06398492e	8		b8b7	r2nbrk1/pqp1bppp/3np3/1p1p4/1P1P1P2/3NP3/P1P1B1PP/RQ1NBRK1 w - - 1 8	b8	b7	q	3829	2026-06-24 09:52:49.488
3ff666a9-84f0-4a28-b7ca-884685abd465	115f48c9-9ce0-4871-bd2c-c96c214974ee	bc772c22-2600-42ee-9e82-55a06398492e	9		f7f5	r2nbrk1/pqp1b1pp/3np3/1p1pNp2/1P1P1P2/4P3/P1P1B1PP/RQ1NBRK1 w - - 0 9	f7	f5	q	11838	2026-06-24 09:52:49.488
4ac3bcfb-fbf8-4670-acc2-4707eb96b61e	115f48c9-9ce0-4871-bd2c-c96c214974ee	bc772c22-2600-42ee-9e82-55a06398492e	10		e7f6	r2nbrk1/pqp3pp/3npb2/1p1pNp2/1P1P1P2/4P1B1/P1P1B1PP/RQ1N1RK1 w - - 2 10	e7	f6	q	7150	2026-06-24 09:52:49.488
a2f71972-ea10-481e-8687-3a2114429698	115f48c9-9ce0-4871-bd2c-c96c214974ee	bc772c22-2600-42ee-9e82-55a06398492e	11		d8c6	r3brk1/pqp3pp/2nnpb2/1p1pNp2/1P1P1P2/2N1P1B1/P1P1B1PP/RQ3RK1 w - - 4 11	d8	c6	q	5428	2026-06-24 09:52:49.488
25af57f7-2fe2-4baa-bbfc-f3e5a751f640	115f48c9-9ce0-4871-bd2c-c96c214974ee	bc772c22-2600-42ee-9e82-55a06398492e	12		b7c6	r3brk1/p1p3pp/2qnpb2/1p1p1p2/1P1P1P2/2N1P1B1/P1P1B1PP/RQ3RK1 w - - 0 12	b7	c6	q	3171	2026-06-24 09:52:49.488
940be20f-ae63-4e73-9c2a-5531e8210de2	115f48c9-9ce0-4871-bd2c-c96c214974ee	bc772c22-2600-42ee-9e82-55a06398492e	13		d5e4	r3brk1/p1p3pp/2qnpb2/1p3p2/1P1PpP2/2N3B1/P1P1B1PP/RQ3RK1 w - - 0 13	d5	e4	q	7359	2026-06-24 09:52:49.488
3e00332c-cb4c-4e9c-b1d0-db50c4383420	115f48c9-9ce0-4871-bd2c-c96c214974ee	bc772c22-2600-42ee-9e82-55a06398492e	14		c6d7	r3brk1/p1pq2pp/3npb2/1p3p2/1P1PpP2/1QN3B1/P1P1B1PP/R4RK1 w - - 2 14	c6	d7	q	13226	2026-06-24 09:52:49.488
92ee4f0f-f5d0-485b-8338-a9fcd40fbc31	115f48c9-9ce0-4871-bd2c-c96c214974ee	bc772c22-2600-42ee-9e82-55a06398492e	15		e6d5	r3brk1/p1pq2pp/3n1b2/1p1p1p2/1P2pP2/1QN3B1/P1P1B1PP/R4RK1 w - - 0 15	e6	d5	q	5334	2026-06-24 09:52:49.488
fe8ca47b-ee31-41cf-be17-dab317d6b276	115f48c9-9ce0-4871-bd2c-c96c214974ee	bc772c22-2600-42ee-9e82-55a06398492e	16		e8f7	r4rk1/p1pq1bpp/3n1b2/1p1Q1p2/1P2pP2/2N3B1/P1P1B1PP/R4RK1 w - - 1 16	e8	f7	q	4793	2026-06-24 09:52:49.488
34025b93-1104-4b10-bc8a-e45588707aba	115f48c9-9ce0-4871-bd2c-c96c214974ee	bc772c22-2600-42ee-9e82-55a06398492e	17		d6c4	r4rk1/p1pq1bpp/5b2/1p3p2/1Pn1pP2/2N3B1/P1PQB1PP/R4RK1 w - - 3 17	d6	c4	q	4638	2026-06-24 09:52:49.488
a831d08a-a1af-414d-8eb4-3d80dbbb255e	115f48c9-9ce0-4871-bd2c-c96c214974ee	bc772c22-2600-42ee-9e82-55a06398492e	18		a8d8	3r1rk1/p1pQ1bpp/5b2/1p3p2/1Pn1pP2/2N3B1/P1P1B1PP/R4RK1 w - - 1 18	a8	d8	q	27194	2026-06-24 09:52:49.488
452d8bc8-ebd3-4e51-9c6c-1d61746562f8	115f48c9-9ce0-4871-bd2c-c96c214974ee	bc772c22-2600-42ee-9e82-55a06398492e	19		f6c3	3r1rk1/p1Q2bpp/8/1p3p2/1Pn1pP2/2b3B1/P1P1B1PP/R4RK1 w - - 0 19	f6	c3	q	18288	2026-06-24 09:52:49.488
66994ee3-f5c3-45d0-bea9-d7d09f91bcfa	115f48c9-9ce0-4871-bd2c-c96c214974ee	bc772c22-2600-42ee-9e82-55a06398492e	20		c4e3	3r1rk1/p1Q2bpp/8/1p3p2/1P2pP2/2b1n1B1/P1P1B1PP/2R2RK1 w - - 2 20	c4	e3	q	11620	2026-06-24 09:52:49.488
7e822f3b-643f-44e0-9f17-ed141cbeceef	115f48c9-9ce0-4871-bd2c-c96c214974ee	bc772c22-2600-42ee-9e82-55a06398492e	21		e3d1	3r1rk1/p1Q2bpp/8/1p3p2/1P2pP2/2b3B1/P1P1B1PP/2Rn2K1 w - - 0 21	e3	d1	q	9614	2026-06-24 09:52:49.488
3130d509-7c57-4ff7-a261-ed91e38b7205	115f48c9-9ce0-4871-bd2c-c96c214974ee	bc772c22-2600-42ee-9e82-55a06398492e	22		c3d4	3r1rk1/p1Q2bpp/8/1p3p2/1P1bpP2/6B1/P1P3PP/2RB2K1 w - - 1 22	c3	d4	q	7820	2026-06-24 09:52:49.488
2e38729c-e75c-4d54-ac88-323df33154c4	115f48c9-9ce0-4871-bd2c-c96c214974ee	bc772c22-2600-42ee-9e82-55a06398492e	23		e4e3	3r1rk1/p1Q2bpp/8/1p3p2/1P1b1P2/4p1B1/P1P3PP/2RB3K w - - 0 23	e4	e3	q	5612	2026-06-24 09:52:49.488
00bff452-34ef-4e74-a701-a643bb3324f3	115f48c9-9ce0-4871-bd2c-c96c214974ee	bc772c22-2600-42ee-9e82-55a06398492e	24		d4b6	3r1rk1/p1Q2bpp/1b6/1p3p2/1P3P2/2P1p1B1/P5PP/2RB3K w - - 1 24	d4	b6	q	4533	2026-06-24 09:52:49.488
1a468d8c-a239-4bd7-ac68-d2eac929de4e	115f48c9-9ce0-4871-bd2c-c96c214974ee	bc772c22-2600-42ee-9e82-55a06398492e	25		d8d3	5rk1/p4bpp/1b6/1p2Qp2/1P3P2/2Prp1B1/P5PP/2RB3K w - - 3 25	d8	d3	q	9398	2026-06-24 09:52:49.488
9879a066-347d-4f3d-a98d-b8eae8beb5cd	115f48c9-9ce0-4871-bd2c-c96c214974ee	bc772c22-2600-42ee-9e82-55a06398492e	26		f7d5	5rk1/p5pp/1b6/1p1b1Q2/1P3P2/2Prp1B1/P5PP/2RB3K w - - 1 26	f7	d5	q	6239	2026-06-24 09:52:49.488
c90c9f72-4073-454f-b643-6f9092d5b484	115f48c9-9ce0-4871-bd2c-c96c214974ee	bc772c22-2600-42ee-9e82-55a06398492e	27		d3d2	5rk1/p5pp/1b6/1p1b4/1P3PQ1/2P1p1B1/P2r2PP/2RB3K w - - 3 27	d3	d2	q	59285	2026-06-24 09:52:49.488
a0ad16b8-27f9-44c4-85d9-ff9e9962f3b2	2e27e16c-50e1-4f3b-a305-98d69933d185	bc772c22-2600-42ee-9e82-55a06398492e	1		d2d4	rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1	d2	d4	q	38277	2026-06-24 10:13:04.164
7bb0ecf7-c6d8-4184-bd35-62052db6a851	6f3e13dc-7cbc-4209-943e-29dc5bdd00a0	d2077c67-d484-4a1d-928f-7a669c02fd0d	1		d2d4	rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1	d2	d4	q	8302	2026-06-25 17:13:57.319
ef338f3c-c3ce-4765-b94c-b05801846abe	6f3e13dc-7cbc-4209-943e-29dc5bdd00a0	bc772c22-2600-42ee-9e82-55a06398492e	2		e7e5	rnbqkbnr/pppp1ppp/8/4p3/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 2	e7	e5	q	3154	2026-06-25 17:13:57.319
da02b2ed-b7d7-4296-8170-d57ff7c7aff3	6f3e13dc-7cbc-4209-943e-29dc5bdd00a0	bc772c22-2600-42ee-9e82-55a06398492e	3		f7f5	rnbqkbnr/pppp2pp/8/4pp2/3P4/5N2/PPP1PPPP/RNBQKB1R w KQkq - 0 3	f7	f5	q	3169	2026-06-25 17:13:57.319
\.


--
-- Data for Name: PairingAudit; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."PairingAudit" (id, "tournamentId", "roundNumber", "playerAId", "playerBId", "pairingScore", "sameScoreGroup", "colorConflict", "repeatOpponent", status, "generatedBy", "createdAt") FROM stdin;
\.


--
-- Data for Name: Puzzle; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Puzzle" (id, "initialFen", solution, "movesToMate", rating, "createdAt") FROM stdin;
\.


--
-- Data for Name: Round; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Round" (id, "tournamentId", "roundNumber", status, "startTime", "endTime", "createdAt") FROM stdin;
2a2f5112-e09c-4538-8277-7827ec62088f	cmqrld7pe000h9zzlc8kmiro2	1	COMPLETED	2026-06-24 04:55:03.199	2026-06-24 05:50:09.485	2026-06-24 04:55:03.199
fbd40d57-4c21-4ee5-901b-2b01761e681e	cmqrufizd000g9zlhhvd10ppb	1	COMPLETED	2026-06-24 09:09:03.106	2026-06-24 09:52:56.722	2026-06-24 09:09:03.106
\.


--
-- Data for Name: SwissSettings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."SwissSettings" (id, "tournamentId", "totalRounds", "pairingEngine", "preventRepeatPairs", "balanceColors", "avoidThreeSameColors", "allowBye", "createdAt") FROM stdin;
cmqrk590s00079zzl7rpsns4e	cmqrk590o00069zzlty1w1djq	2	DUTCH	t	t	t	t	2026-06-24 04:12:54.887
cmqrld7ph000i9zzl05my5nvl	cmqrld7pe000h9zzlc8kmiro2	2	DUTCH	t	t	t	t	2026-06-24 04:47:06.049
cmqrorgsu00019zlhdbo7krna	cmqrorgsu00009zlhuhr2qbka	2	DUTCH	t	t	t	t	2026-06-24 06:22:09.871
cmqrs3jyn00099zlh0nk5a6ob	cmqrs3jyn00089zlhoqtl2792	2	DUTCH	t	t	t	t	2026-06-24 07:55:32.688
cmqrufizd000h9zlhekpj0sgn	cmqrufizd000g9zlhhvd10ppb	2	DUTCH	t	t	t	t	2026-06-24 09:00:50.521
\.


--
-- Data for Name: TimeControl; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."TimeControl" (id, category, "initialTimeSec", "incrementSec", "daysPerMove", "displayName", "createdAt") FROM stdin;
tc-bullet-1-0	BULLET	60	0	0	1+0	2026-06-24 04:06:51.93
tc-bullet-1-1	BULLET	60	1	0	1+1	2026-06-24 04:06:52.084
tc-bullet-2-1	BULLET	120	1	0	2+1	2026-06-24 04:06:52.164
tc-bullet-2-0	BULLET	120	0	0	2+0	2026-06-24 04:06:52.252
tc-blitz-3-0	BLITZ	180	0	0	3+0	2026-06-24 04:06:52.329
tc-blitz-3-2	BLITZ	180	2	0	3+2	2026-06-24 04:06:52.404
tc-blitz-5-0	BLITZ	300	0	0	5+0	2026-06-24 04:06:52.483
tc-blitz-5-3	BLITZ	300	3	0	5+3	2026-06-24 04:06:52.559
tc-rapid-10-0	RAPID	600	0	0	10+0	2026-06-24 04:06:52.633
tc-rapid-10-5	RAPID	600	5	0	10+5	2026-06-24 04:06:52.708
tc-rapid-15-10	RAPID	900	10	0	15+10	2026-06-24 04:06:52.783
tc-rapid-30-0	RAPID	1800	0	0	30+0	2026-06-24 04:06:52.854
tc-daily-1	DAILY	0	0	1	1 day	2026-06-24 04:06:52.926
tc-daily-2	DAILY	0	0	2	2 days	2026-06-24 04:06:53.007
tc-daily-3	DAILY	0	0	3	3 days	2026-06-24 04:06:53.096
tc-daily-7	DAILY	0	0	7	7 days	2026-06-24 04:06:53.174
tc-daily-14	DAILY	0	0	14	14 days	2026-06-24 04:06:53.247
\.


--
-- Data for Name: Tournament; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Tournament" (id, name, description, "accessType", "tournamentType", visibility, status, "creatorId", "clubId", "gameType", "isRated", "inviteOnly", "premiumOnly", "requiresApproval", "autoStartWhenFull", "allowVacation", "allowLateJoin", "useTieBreaks", "tieBreakMethod", "minPlayers", "maxPlayers", "minRating", "maxRating", "minGamesPlayed", "customFen", "openingName", "timeControlId", "createdAt", "updatedAt", "deletedAt") FROM stdin;
cmqrk590o00069zzlty1w1djq	chessopen	...	OPEN	GLOBAL_ROUND_ROBIN	PUBLIC	REGISTRATION_OPEN	d2077c67-d484-4a1d-928f-7a669c02fd0d	\N	CHESS960	t	f	f	f	f	f	f	t	\N	2	2	1000	1100	\N	\N	\N	tc-blitz-5-0	2026-06-24 04:12:54.887	2026-06-24 04:12:54.887	\N
cmqrld7pe000h9zzlc8kmiro2	chess5000	...	OPEN	GLOBAL_ROUND_ROBIN	PUBLIC	COMPLETED	bc772c22-2600-42ee-9e82-55a06398492e	\N	CHESS960	t	f	f	f	f	f	f	t	\N	2	2	1000	1100	\N	\N	\N	tc-blitz-5-0	2026-06-24 04:47:06.049	2026-06-24 05:50:12.308	\N
cmqrorgsu00009zlhuhr2qbka	chess	..	OPEN	GLOBAL_ROUND_ROBIN	PUBLIC	REGISTRATION_OPEN	d2077c67-d484-4a1d-928f-7a669c02fd0d	\N	CHESS960	t	f	f	f	f	f	f	t	\N	2	2	1000	1100	\N	\N	\N	tc-blitz-5-0	2026-06-24 06:22:09.871	2026-06-24 06:22:09.871	\N
cmqrs3jyn00089zlhoqtl2792	chess8088	...	OPEN	GLOBAL_ROUND_ROBIN	PUBLIC	REGISTRATION_OPEN	bc772c22-2600-42ee-9e82-55a06398492e	\N	STANDARD	t	f	f	f	f	f	f	t	\N	2	2	1000	1100	\N	\N	\N	tc-blitz-5-0	2026-06-24 07:55:32.688	2026-06-24 07:55:32.688	\N
cmqrufizd000g9zlhhvd10ppb	chess10000	...	OPEN	GLOBAL_ROUND_ROBIN	PUBLIC	COMPLETED	d2077c67-d484-4a1d-928f-7a669c02fd0d	\N	CHESS960	t	f	f	f	f	f	f	t	\N	2	2	1000	1100	\N	\N	\N	tc-blitz-5-0	2026-06-24 09:00:50.521	2026-06-24 09:52:59.082	\N
\.


--
-- Data for Name: TournamentBye; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."TournamentBye" (id, "tournamentId", "playerId", "roundNumber", "byeType", "createdAt") FROM stdin;
\.


--
-- Data for Name: TournamentGroup; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."TournamentGroup" (id, "tournamentId", "roundNumber", "groupNumber", "createdAt") FROM stdin;
b6290026-cc66-4102-87ef-d23946abaa7a	cmqrld7pe000h9zzlc8kmiro2	1	1	2026-06-24 04:55:03.199
68080a4b-e913-487e-a006-6f5b33b3eef3	cmqrufizd000g9zlhhvd10ppb	1	1	2026-06-24 09:09:03.106
\.


--
-- Data for Name: TournamentInvite; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."TournamentInvite" (id, "tournamentId", "invitedPlayerId", "invitedById", status, "createdAt") FROM stdin;
\.


--
-- Data for Name: TournamentParticipant; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."TournamentParticipant" (id, "tournamentId", "playerId", role, seed, "ratingAtJoin", "joinedAt") FROM stdin;
cmqrk5q10000b9zzl595ut3db	cmqrk590o00069zzlty1w1djq	d2077c67-d484-4a1d-928f-7a669c02fd0d	PLAYER	\N	\N	2026-06-24 04:13:16.932
cmqrk6dgc000d9zzlm4bs8dgc	cmqrk590o00069zzlty1w1djq	bc772c22-2600-42ee-9e82-55a06398492e	PLAYER	\N	\N	2026-06-24 04:13:47.292
cmqrldfhm000m9zzlqruqd961	cmqrld7pe000h9zzlc8kmiro2	bc772c22-2600-42ee-9e82-55a06398492e	PLAYER	\N	\N	2026-06-24 04:47:16.137
cmqrldx0r000o9zzlinoku4vv	cmqrld7pe000h9zzlc8kmiro2	d2077c67-d484-4a1d-928f-7a669c02fd0d	PLAYER	\N	\N	2026-06-24 04:47:38.858
cmqrorkiv00059zlh4kdlpe1t	cmqrorgsu00009zlhuhr2qbka	d2077c67-d484-4a1d-928f-7a669c02fd0d	PLAYER	\N	\N	2026-06-24 06:22:14.695
cmqros25m00079zlhhoo0hkui	cmqrorgsu00009zlhuhr2qbka	bc772c22-2600-42ee-9e82-55a06398492e	PLAYER	\N	\N	2026-06-24 06:22:37.546
cmqrs3n6y000d9zlhvtrx7kcw	cmqrs3jyn00089zlhoqtl2792	bc772c22-2600-42ee-9e82-55a06398492e	PLAYER	\N	\N	2026-06-24 07:55:36.874
cmqrs4182000f9zlhp1npm6w9	cmqrs3jyn00089zlhoqtl2792	d2077c67-d484-4a1d-928f-7a669c02fd0d	PLAYER	\N	\N	2026-06-24 07:55:55.059
cmqrufn06000l9zlh2t7om2k4	cmqrufizd000g9zlhhvd10ppb	d2077c67-d484-4a1d-928f-7a669c02fd0d	PLAYER	\N	\N	2026-06-24 09:00:55.734
cmqrufzzw000n9zlh7cgsp41e	cmqrufizd000g9zlhhvd10ppb	bc772c22-2600-42ee-9e82-55a06398492e	PLAYER	\N	\N	2026-06-24 09:01:12.573
\.


--
-- Data for Name: TournamentPlayerStats; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."TournamentPlayerStats" (id, "tournamentParticipantId", score, wins, draws, losses, "currentRank", "byeReceived", "consecutiveWhite", "consecutiveBlack", "totalWhiteGames", "totalBlackGames", buchholz, "medianBuchholz", "sonnebornBerger", "cumulativeScore", "performanceRating", "directEncounterScore", "updatedAt") FROM stdin;
\.


--
-- Data for Name: TournamentStanding; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."TournamentStanding" (id, "tournamentId", "playerId", rank, score, wins, draws, losses, buchholz, "medianBuchholz", "sonnebornBerger", "directEncounterScore", "updatedAt") FROM stdin;
\.


--
-- Data for Name: TournamentTimeManagement; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."TournamentTimeManagement" (id, "tournamentId", "registrationOpenAt", "registrationCloseAt", "startTime", "endTime") FROM stdin;
cmqrk59s300099zzl9yed58ap	cmqrk590o00069zzlty1w1djq	2026-06-24 03:34:00	2026-06-24 04:15:00	2026-06-24 04:45:00	2026-06-24 08:04:00
cmqrld8ga000k9zzlzjqhnd5r	cmqrld7pe000h9zzlc8kmiro2	2026-06-24 04:45:00	2026-06-24 04:49:00	2026-06-24 05:10:00	2026-06-24 09:15:00
cmqrorhhd00039zlh32bcjzde	cmqrorgsu00009zlhuhr2qbka	2026-06-24 06:21:00	2026-06-24 06:25:00	2026-06-24 06:51:00	2026-06-24 10:51:00
cmqrs3kmm000b9zlhg6d8vogi	cmqrs3jyn00089zlhoqtl2792	2026-06-24 07:54:00	2026-06-24 07:58:00	2026-06-24 08:35:00	2026-06-24 12:24:00
cmqrufjoa000j9zlhyq4ml92l	cmqrufizd000g9zlhhvd10ppb	2026-06-24 08:59:00	2026-06-24 09:04:00	2026-06-24 09:24:00	2026-06-24 13:29:00
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."User" (id, username, email, "profileImageUrl", bio, password, "isAdmin", rating, wins, losses, draws, "tournamentId", "createdAt", "updatedAt") FROM stdin;
d2077c67-d484-4a1d-928f-7a669c02fd0d	bhat	bhatvinay74@gmail.com	\N	\N	$2b$10$1IErPjIFTK3Nv1QraVrUWuQO8SVii3Ut1kXzv2Zp7HpIioy1RcQWi	f	1185	3	9	8	\N	2026-06-23 17:38:33.893	2026-06-25 17:14:07.513
bc772c22-2600-42ee-9e82-55a06398492e	govindh	bhatvinay75@gmail.com	\N	\N	$2b$10$3ox2Y8yxSmLZb.veme5SkeLMd3NbjuM/FftwDXSBkuyv.Flt14kiK	f	1215	9	3	8	\N	2026-06-23 17:40:14.522	2026-06-25 17:14:07.513
efdbb1d9-bab3-48a3-813b-356eb28cc600	btttt	tickethandle24@gmail.com	\N	\N	$2b$10$l//rJdJhVRGBlUXECh1z5OXeodb40iqH7Ep4qzDLL3bUG0jaBrm0u	f	1200	0	0	0	\N	2026-06-24 04:22:38.392	2026-06-24 04:22:38.392
\.


--
-- Data for Name: UserRating; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."UserRating" (id, "userId", category, rating, wins, losses, draws, "createdAt", "updatedAt") FROM stdin;
cmqqxhgyt00009zi7r583i6f2	d2077c67-d484-4a1d-928f-7a669c02fd0d	BULLET	1200	0	0	0	2026-06-23 17:38:33.893	2026-06-23 17:38:33.893
cmqqxhgyt00029zi7hczl3wpq	d2077c67-d484-4a1d-928f-7a669c02fd0d	RAPID	1200	0	0	0	2026-06-23 17:38:33.893	2026-06-23 17:38:33.893
cmqqxjmm200039zi71214me8l	bc772c22-2600-42ee-9e82-55a06398492e	BULLET	1200	0	0	0	2026-06-23 17:40:14.522	2026-06-23 17:40:14.522
cmqqxjmm200059zi7za4ndtb9	bc772c22-2600-42ee-9e82-55a06398492e	RAPID	1200	0	0	0	2026-06-23 17:40:14.522	2026-06-23 17:40:14.522
cmqrkhr96000e9zzlg7behqr1	efdbb1d9-bab3-48a3-813b-356eb28cc600	BULLET	1200	0	0	0	2026-06-24 04:22:38.392	2026-06-24 04:22:38.392
cmqrkhr96000f9zzl4b2cb0nz	efdbb1d9-bab3-48a3-813b-356eb28cc600	BLITZ	1200	0	0	0	2026-06-24 04:22:38.392	2026-06-24 04:22:38.392
cmqrkhr96000g9zzluixxksvo	efdbb1d9-bab3-48a3-813b-356eb28cc600	RAPID	1200	0	0	0	2026-06-24 04:22:38.392	2026-06-24 04:22:38.392
cmqqxhgyt00019zi7jh2f0moj	d2077c67-d484-4a1d-928f-7a669c02fd0d	BLITZ	1185	3	9	8	2026-06-23 17:38:33.893	2026-06-25 17:14:07.513
cmqqxjmm200049zi7kpct04pw	bc772c22-2600-42ee-9e82-55a06398492e	BLITZ	1215	9	3	8	2026-06-23 17:40:14.522	2026-06-25 17:14:07.513
\.


--
-- Data for Name: _RoundToTournamentGroup; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."_RoundToTournamentGroup" ("A", "B") FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
f0bb9c0b-0c7a-47bf-8a66-db2a12db5a78	5085e8abc4dcaf37b3c012f0e0b8805a9db703eab2353371a5b8ca1a282f0132	2026-06-23 17:25:39.978235+00	20260623172538_update_db	\N	\N	2026-06-23 17:25:39.080599+00	1
\.


--
-- Name: ArenaSettings ArenaSettings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."ArenaSettings"
    ADD CONSTRAINT "ArenaSettings_pkey" PRIMARY KEY (id);


--
-- Name: ClubCoordinatorInvite ClubCoordinatorInvite_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."ClubCoordinatorInvite"
    ADD CONSTRAINT "ClubCoordinatorInvite_pkey" PRIMARY KEY (id);


--
-- Name: ClubJoinRequest ClubJoinRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."ClubJoinRequest"
    ADD CONSTRAINT "ClubJoinRequest_pkey" PRIMARY KEY (id);


--
-- Name: ClubMember ClubMember_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."ClubMember"
    ADD CONSTRAINT "ClubMember_pkey" PRIMARY KEY (id);


--
-- Name: Club Club_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Club"
    ADD CONSTRAINT "Club_pkey" PRIMARY KEY (id);


--
-- Name: CrossClubInvite CrossClubInvite_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."CrossClubInvite"
    ADD CONSTRAINT "CrossClubInvite_pkey" PRIMARY KEY (id);


--
-- Name: DailySettings DailySettings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."DailySettings"
    ADD CONSTRAINT "DailySettings_pkey" PRIMARY KEY (id);


--
-- Name: Friendship Friendship_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Friendship"
    ADD CONSTRAINT "Friendship_pkey" PRIMARY KEY (id);


--
-- Name: GameAnalysis GameAnalysis_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."GameAnalysis"
    ADD CONSTRAINT "GameAnalysis_pkey" PRIMARY KEY (id);


--
-- Name: GameState GameState_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."GameState"
    ADD CONSTRAINT "GameState_pkey" PRIMARY KEY (id);


--
-- Name: Game Game_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Game"
    ADD CONSTRAINT "Game_pkey" PRIMARY KEY (id);


--
-- Name: Match Match_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Match"
    ADD CONSTRAINT "Match_pkey" PRIMARY KEY (id);


--
-- Name: Move Move_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Move"
    ADD CONSTRAINT "Move_pkey" PRIMARY KEY (id);


--
-- Name: PairingAudit PairingAudit_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."PairingAudit"
    ADD CONSTRAINT "PairingAudit_pkey" PRIMARY KEY (id);


--
-- Name: Puzzle Puzzle_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Puzzle"
    ADD CONSTRAINT "Puzzle_pkey" PRIMARY KEY (id);


--
-- Name: Round Round_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Round"
    ADD CONSTRAINT "Round_pkey" PRIMARY KEY (id);


--
-- Name: SwissSettings SwissSettings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."SwissSettings"
    ADD CONSTRAINT "SwissSettings_pkey" PRIMARY KEY (id);


--
-- Name: TimeControl TimeControl_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."TimeControl"
    ADD CONSTRAINT "TimeControl_pkey" PRIMARY KEY (id);


--
-- Name: TournamentBye TournamentBye_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."TournamentBye"
    ADD CONSTRAINT "TournamentBye_pkey" PRIMARY KEY (id);


--
-- Name: TournamentGroup TournamentGroup_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."TournamentGroup"
    ADD CONSTRAINT "TournamentGroup_pkey" PRIMARY KEY (id);


--
-- Name: TournamentInvite TournamentInvite_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."TournamentInvite"
    ADD CONSTRAINT "TournamentInvite_pkey" PRIMARY KEY (id);


--
-- Name: TournamentParticipant TournamentParticipant_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."TournamentParticipant"
    ADD CONSTRAINT "TournamentParticipant_pkey" PRIMARY KEY (id);


--
-- Name: TournamentPlayerStats TournamentPlayerStats_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."TournamentPlayerStats"
    ADD CONSTRAINT "TournamentPlayerStats_pkey" PRIMARY KEY (id);


--
-- Name: TournamentStanding TournamentStanding_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."TournamentStanding"
    ADD CONSTRAINT "TournamentStanding_pkey" PRIMARY KEY (id);


--
-- Name: TournamentTimeManagement TournamentTimeManagement_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."TournamentTimeManagement"
    ADD CONSTRAINT "TournamentTimeManagement_pkey" PRIMARY KEY (id);


--
-- Name: Tournament Tournament_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Tournament"
    ADD CONSTRAINT "Tournament_pkey" PRIMARY KEY (id);


--
-- Name: UserRating UserRating_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."UserRating"
    ADD CONSTRAINT "UserRating_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _RoundToTournamentGroup _RoundToTournamentGroup_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."_RoundToTournamentGroup"
    ADD CONSTRAINT "_RoundToTournamentGroup_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: ArenaSettings_tournamentId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "ArenaSettings_tournamentId_key" ON public."ArenaSettings" USING btree ("tournamentId");


--
-- Name: ClubCoordinatorInvite_clubId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "ClubCoordinatorInvite_clubId_idx" ON public."ClubCoordinatorInvite" USING btree ("clubId");


--
-- Name: ClubCoordinatorInvite_clubId_invitedUserId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "ClubCoordinatorInvite_clubId_invitedUserId_key" ON public."ClubCoordinatorInvite" USING btree ("clubId", "invitedUserId");


--
-- Name: ClubJoinRequest_clubId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "ClubJoinRequest_clubId_idx" ON public."ClubJoinRequest" USING btree ("clubId");


--
-- Name: ClubJoinRequest_clubId_userId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "ClubJoinRequest_clubId_userId_key" ON public."ClubJoinRequest" USING btree ("clubId", "userId");


--
-- Name: ClubMember_clubId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "ClubMember_clubId_idx" ON public."ClubMember" USING btree ("clubId");


--
-- Name: ClubMember_clubId_userId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "ClubMember_clubId_userId_key" ON public."ClubMember" USING btree ("clubId", "userId");


--
-- Name: ClubMember_userId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "ClubMember_userId_idx" ON public."ClubMember" USING btree ("userId");


--
-- Name: Club_name_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "Club_name_key" ON public."Club" USING btree (name);


--
-- Name: CrossClubInvite_clubId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "CrossClubInvite_clubId_idx" ON public."CrossClubInvite" USING btree ("clubId");


--
-- Name: CrossClubInvite_tournamentId_clubId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "CrossClubInvite_tournamentId_clubId_key" ON public."CrossClubInvite" USING btree ("tournamentId", "clubId");


--
-- Name: DailySettings_tournamentId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "DailySettings_tournamentId_key" ON public."DailySettings" USING btree ("tournamentId");


--
-- Name: Friendship_recipientId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Friendship_recipientId_idx" ON public."Friendship" USING btree ("recipientId");


--
-- Name: Friendship_requesterId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Friendship_requesterId_idx" ON public."Friendship" USING btree ("requesterId");


--
-- Name: Friendship_requesterId_recipientId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "Friendship_requesterId_recipientId_key" ON public."Friendship" USING btree ("requesterId", "recipientId");


--
-- Name: GameAnalysis_gameId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "GameAnalysis_gameId_idx" ON public."GameAnalysis" USING btree ("gameId");


--
-- Name: GameAnalysis_gameId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "GameAnalysis_gameId_key" ON public."GameAnalysis" USING btree ("gameId");


--
-- Name: GameState_gameId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "GameState_gameId_idx" ON public."GameState" USING btree ("gameId");


--
-- Name: GameState_gameId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "GameState_gameId_key" ON public."GameState" USING btree ("gameId");


--
-- Name: Game_blackPlayerId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Game_blackPlayerId_idx" ON public."Game" USING btree ("blackPlayerId");


--
-- Name: Game_createdAt_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Game_createdAt_idx" ON public."Game" USING btree ("createdAt");


--
-- Name: Game_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Game_status_idx" ON public."Game" USING btree (status);


--
-- Name: Game_whitePlayerId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Game_whitePlayerId_idx" ON public."Game" USING btree ("whitePlayerId");


--
-- Name: Move_gameId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Move_gameId_idx" ON public."Move" USING btree ("gameId");


--
-- Name: Move_gameId_moveNumber_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "Move_gameId_moveNumber_key" ON public."Move" USING btree ("gameId", "moveNumber");


--
-- Name: Move_playerId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Move_playerId_idx" ON public."Move" USING btree ("playerId");


--
-- Name: Round_tournamentId_roundNumber_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "Round_tournamentId_roundNumber_key" ON public."Round" USING btree ("tournamentId", "roundNumber");


--
-- Name: SwissSettings_tournamentId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "SwissSettings_tournamentId_key" ON public."SwissSettings" USING btree ("tournamentId");


--
-- Name: TournamentBye_tournamentId_playerId_roundNumber_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "TournamentBye_tournamentId_playerId_roundNumber_key" ON public."TournamentBye" USING btree ("tournamentId", "playerId", "roundNumber");


--
-- Name: TournamentGroup_tournamentId_roundNumber_groupNumber_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "TournamentGroup_tournamentId_roundNumber_groupNumber_key" ON public."TournamentGroup" USING btree ("tournamentId", "roundNumber", "groupNumber");


--
-- Name: TournamentInvite_tournamentId_invitedPlayerId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "TournamentInvite_tournamentId_invitedPlayerId_key" ON public."TournamentInvite" USING btree ("tournamentId", "invitedPlayerId");


--
-- Name: TournamentParticipant_tournamentId_playerId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "TournamentParticipant_tournamentId_playerId_key" ON public."TournamentParticipant" USING btree ("tournamentId", "playerId");


--
-- Name: TournamentPlayerStats_tournamentParticipantId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "TournamentPlayerStats_tournamentParticipantId_key" ON public."TournamentPlayerStats" USING btree ("tournamentParticipantId");


--
-- Name: TournamentStanding_playerId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "TournamentStanding_playerId_key" ON public."TournamentStanding" USING btree ("playerId");


--
-- Name: TournamentStanding_tournamentId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "TournamentStanding_tournamentId_key" ON public."TournamentStanding" USING btree ("tournamentId");


--
-- Name: TournamentStanding_tournamentId_playerId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "TournamentStanding_tournamentId_playerId_key" ON public."TournamentStanding" USING btree ("tournamentId", "playerId");


--
-- Name: TournamentTimeManagement_tournamentId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "TournamentTimeManagement_tournamentId_key" ON public."TournamentTimeManagement" USING btree ("tournamentId");


--
-- Name: UserRating_userId_category_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "UserRating_userId_category_key" ON public."UserRating" USING btree ("userId", category);


--
-- Name: UserRating_userId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "UserRating_userId_idx" ON public."UserRating" USING btree ("userId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_username_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "User_username_key" ON public."User" USING btree (username);


--
-- Name: _RoundToTournamentGroup_B_index; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "_RoundToTournamentGroup_B_index" ON public."_RoundToTournamentGroup" USING btree ("B");


--
-- Name: ArenaSettings ArenaSettings_tournamentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."ArenaSettings"
    ADD CONSTRAINT "ArenaSettings_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES public."Tournament"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ClubCoordinatorInvite ClubCoordinatorInvite_clubId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."ClubCoordinatorInvite"
    ADD CONSTRAINT "ClubCoordinatorInvite_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES public."Club"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ClubCoordinatorInvite ClubCoordinatorInvite_invitedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."ClubCoordinatorInvite"
    ADD CONSTRAINT "ClubCoordinatorInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ClubCoordinatorInvite ClubCoordinatorInvite_invitedUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."ClubCoordinatorInvite"
    ADD CONSTRAINT "ClubCoordinatorInvite_invitedUserId_fkey" FOREIGN KEY ("invitedUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ClubJoinRequest ClubJoinRequest_clubId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."ClubJoinRequest"
    ADD CONSTRAINT "ClubJoinRequest_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES public."Club"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ClubJoinRequest ClubJoinRequest_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."ClubJoinRequest"
    ADD CONSTRAINT "ClubJoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ClubMember ClubMember_clubId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."ClubMember"
    ADD CONSTRAINT "ClubMember_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES public."Club"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ClubMember ClubMember_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."ClubMember"
    ADD CONSTRAINT "ClubMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Club Club_creatorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Club"
    ADD CONSTRAINT "Club_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CrossClubInvite CrossClubInvite_clubId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."CrossClubInvite"
    ADD CONSTRAINT "CrossClubInvite_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES public."Club"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CrossClubInvite CrossClubInvite_tournamentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."CrossClubInvite"
    ADD CONSTRAINT "CrossClubInvite_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES public."Tournament"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DailySettings DailySettings_tournamentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."DailySettings"
    ADD CONSTRAINT "DailySettings_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES public."Tournament"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Friendship Friendship_recipientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Friendship"
    ADD CONSTRAINT "Friendship_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Friendship Friendship_requesterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Friendship"
    ADD CONSTRAINT "Friendship_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: GameAnalysis GameAnalysis_gameId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."GameAnalysis"
    ADD CONSTRAINT "GameAnalysis_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES public."Game"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: GameState GameState_gameId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."GameState"
    ADD CONSTRAINT "GameState_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES public."Game"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Game Game_blackPlayerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Game"
    ADD CONSTRAINT "Game_blackPlayerId_fkey" FOREIGN KEY ("blackPlayerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Game Game_puzzleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Game"
    ADD CONSTRAINT "Game_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES public."Puzzle"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Game Game_tournamentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Game"
    ADD CONSTRAINT "Game_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES public."Tournament"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Game Game_whitePlayerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Game"
    ADD CONSTRAINT "Game_whitePlayerId_fkey" FOREIGN KEY ("whitePlayerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Game Game_winnerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Game"
    ADD CONSTRAINT "Game_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Match Match_gameId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Match"
    ADD CONSTRAINT "Match_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES public."Game"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Match Match_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Match"
    ADD CONSTRAINT "Match_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."TournamentGroup"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Match Match_roundId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Match"
    ADD CONSTRAINT "Match_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES public."Round"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Match Match_tournamentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Match"
    ADD CONSTRAINT "Match_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES public."Tournament"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Move Move_gameId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Move"
    ADD CONSTRAINT "Move_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES public."Game"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Move Move_playerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Move"
    ADD CONSTRAINT "Move_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PairingAudit PairingAudit_tournamentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."PairingAudit"
    ADD CONSTRAINT "PairingAudit_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES public."Tournament"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Round Round_tournamentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Round"
    ADD CONSTRAINT "Round_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES public."Tournament"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SwissSettings SwissSettings_tournamentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."SwissSettings"
    ADD CONSTRAINT "SwissSettings_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES public."Tournament"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TournamentBye TournamentBye_playerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."TournamentBye"
    ADD CONSTRAINT "TournamentBye_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TournamentBye TournamentBye_tournamentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."TournamentBye"
    ADD CONSTRAINT "TournamentBye_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES public."Tournament"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TournamentGroup TournamentGroup_tournamentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."TournamentGroup"
    ADD CONSTRAINT "TournamentGroup_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES public."Tournament"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TournamentInvite TournamentInvite_invitedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."TournamentInvite"
    ADD CONSTRAINT "TournamentInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TournamentInvite TournamentInvite_invitedPlayerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."TournamentInvite"
    ADD CONSTRAINT "TournamentInvite_invitedPlayerId_fkey" FOREIGN KEY ("invitedPlayerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TournamentInvite TournamentInvite_tournamentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."TournamentInvite"
    ADD CONSTRAINT "TournamentInvite_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES public."Tournament"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TournamentParticipant TournamentParticipant_playerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."TournamentParticipant"
    ADD CONSTRAINT "TournamentParticipant_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TournamentParticipant TournamentParticipant_tournamentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."TournamentParticipant"
    ADD CONSTRAINT "TournamentParticipant_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES public."Tournament"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TournamentPlayerStats TournamentPlayerStats_tournamentParticipantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."TournamentPlayerStats"
    ADD CONSTRAINT "TournamentPlayerStats_tournamentParticipantId_fkey" FOREIGN KEY ("tournamentParticipantId") REFERENCES public."TournamentParticipant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TournamentStanding TournamentStanding_playerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."TournamentStanding"
    ADD CONSTRAINT "TournamentStanding_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TournamentStanding TournamentStanding_tournamentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."TournamentStanding"
    ADD CONSTRAINT "TournamentStanding_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES public."Tournament"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TournamentTimeManagement TournamentTimeManagement_tournamentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."TournamentTimeManagement"
    ADD CONSTRAINT "TournamentTimeManagement_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES public."Tournament"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Tournament Tournament_clubId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Tournament"
    ADD CONSTRAINT "Tournament_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES public."Club"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Tournament Tournament_creatorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Tournament"
    ADD CONSTRAINT "Tournament_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Tournament Tournament_timeControlId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Tournament"
    ADD CONSTRAINT "Tournament_timeControlId_fkey" FOREIGN KEY ("timeControlId") REFERENCES public."TimeControl"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: UserRating UserRating_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."UserRating"
    ADD CONSTRAINT "UserRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: User User_tournamentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES public."Tournament"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: _RoundToTournamentGroup _RoundToTournamentGroup_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."_RoundToTournamentGroup"
    ADD CONSTRAINT "_RoundToTournamentGroup_A_fkey" FOREIGN KEY ("A") REFERENCES public."Round"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _RoundToTournamentGroup _RoundToTournamentGroup_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."_RoundToTournamentGroup"
    ADD CONSTRAINT "_RoundToTournamentGroup_B_fkey" FOREIGN KEY ("B") REFERENCES public."TournamentGroup"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: neondb_owner
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict hbcoGHN2VMPLEighvz8IVbOKJi4BqXYjDwB5MkPoMCdsEkeplwea4FNeRzd8EJv

