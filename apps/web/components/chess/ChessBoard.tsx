"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import styles from "./ChessBoard.module.css";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useProfile } from "../../hooks/useProfile";
import { useMatchmaker } from "../../hooks/useSocket/useMatchmaker";
import { useGameRoom } from "../../hooks/useSocket/useGameRoom";
import { useChessGame, formatTime } from "../../hooks/useChessGame";
import { MoveHistoryPanel } from "./MoveHistoryPanel";
import { ArenaLobby } from "./ArenaLobby";
import { GameOverModal } from "./GameOverModal";
import { ResumeGameModal } from "./ResumeGameModal";
import { DrawRequestModal } from "./DrawRequestModal";
import { DrawNotice } from "./DrawNotice";
import { BoardUI } from "./board";
import { PlayerBar } from "./PlayerBar";
import { useBoardTheme } from "../../hooks/useBoardTheme";
import { useSearchSselection } from "@/hooks/useSearchSelection";
import { useGameResult } from "../../hooks/useGameResult";

const DEFAULT_AVATAR = "/defaultUser.jpg";

/* Loading shell rendered while auth state is being resolved */
function ArenaLoadingShell() {
  return (
    <div className={styles.arenaOuter}>
      <div className={styles.lobbyContainer}>
        <div className={styles.lobbyCard}>
          <div className={styles.arenaChecking}>
            <div className={styles.arenaSpinnerWrap}>
              <div className={styles.arenaSpinner} />
              <span className={styles.arenaCheckingPiece}>♜</span>
            </div>
            <p className={styles.arenaCheckingText}>
              Loading arena
              <span className={styles.arenaCheckingDots} aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */

interface ArenaBoardProps {
  /** Optional — passed from /arena/[gameId] dynamic route. Cosmetic only;
   *  the real game state is resolved from Redis by the ws-server via join_arena. */
  urlGameId?: string;
}

export default function ArenaChessBoard({ urlGameId }: ArenaBoardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);

  const { theme: boardTheme } = useBoardTheme();
  const {
    isRated,
    time_slot,
    group,
    setTimeControl,
    setIsRatedGame,
    gameVariant,
    setGameVariant,
  } = useSearchSselection();

  const {
    isSearching,
    searchStatus,
    matchData,
    startSearch,
    leaveSearch,
    abandonSearch,
    setMatchData,
  } = useMatchmaker();

  const {
    activeGameId,
    gameState,
    movesHistory,
    invalidMove,
    isCheckingActiveGame,
    serverTimes,
    pendingActiveGame,
    joinArena,
    syncGameState,
    resumeActiveGame,
    dismissActiveGame,
    sendMove,
    resign,
    abort,
    leaveGame,
    drawOffer,
    drawNotice,
    drawOfferSent,
    offerDraw,
    acceptDraw,
    declineDraw,
    checkDrawOffer,
    clearDrawNotice,
    rematchStatus,
    incomingRematch,
    sendRematchRequest,
    acceptRematch,
    declineRematch,
    checkRematchRequest,
    showBoardAnimation,
    clearBoardAnimation,
    setGameState,
    setMovesHistory,
    setActiveGameId,
  } = useGameRoom();

  const [hasCheckedActiveGame, setHasCheckedActiveGame] = useState(false);
  // Start as true so user sees PlayChessMenu first and manually initiates search
  const [searchCancelled, setSearchCancelled] = useState(true);

  /* ── Side-determination ──────────────────────────────────────────────── */
  const isWhite = useMemo(() => {
    if (user == null) return true;
    if (gameState?.whitePlayerId) return gameState.whitePlayerId === user.id;
    return matchData?.p1.userId === user.id;
  }, [user, gameState?.whitePlayerId, matchData?.p1.userId]);

  /* Prefer live matchData; fall back to game-state IDs on refresh */
  const opponentId =
    (isWhite ? matchData?.p2.userId : matchData?.p1.userId) ??
    (isWhite ? gameState?.player2Id : gameState?.player1Id);
  const { data: opponentProfile } = useProfile(opponentId);

  /* ── Chess engine hook ───────────────────────────────────────────────── */
  const {
    game,
    displayedFen,
    moveHistory,
    currentMoveIdx,
    moveScrollRef,
    optionSquares,
    boardArrows,
    displayWhiteTime,
    displayBlackTime,
    isUserTurn,
    pairs,
    capturedPieces,
    pendingPromotion,
    handleSquareClick,
    handlePieceDragBegin,
    handleDrop,
    handleShowHint,
    handlePromotionSelect,
    handleCancelPromotion,
    handleFirstMove,
    handlePreviousMove,
    handleNextMove,
    handleLastMove,
    handleSelectMove,
    canDragPiece,
  } = useChessGame({
    movesHistory,
    gameState,
    invalidMove,
    activeGameId,
    serverTimes,
    sendMove,
    isWhite,
    user: user ?? null,
    onTimeout: user ? () => syncGameState(user.id) : undefined,
  });

  /* ── Search timer ────────────────────────────────────────────────────── */
  const [searchTimer, setSearchTimer] = useState(0);
  useEffect(() => {
    if (!isSearching) {
      setSearchTimer(0);
      return;
    }
    const id = setInterval(() => setSearchTimer((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [isSearching, searchStatus]);

  /* ── Join arena on mount ─────────────────────────────────────────────── */
  useEffect(() => {
    if (user && !hasCheckedActiveGame) {
      const emitted = joinArena(user.id);
      if (emitted) setHasCheckedActiveGame(true);
    }
  }, [user, joinArena, hasCheckedActiveGame]);

  /* ── Background game-state sync every 10 s ───────────────────────────── */
  // useEffect(() => {
  //   if (!activeGameId || !user) return;
  //   const id = setInterval(() => syncGameState(user.id), 10_000);
  //   return () => clearInterval(id);
  // }, [activeGameId, user, syncGameState]);

  useEffect(() => {
    if (!activeGameId || !user || drawOffer) return;
    checkDrawOffer(user.id);
  }, [activeGameId, user, checkDrawOffer, drawOffer]);

  /* ── Auto-start search when no active game found ─────────────────────── */
  useEffect(() => {
    if (
      hasCheckedActiveGame &&
      !isCheckingActiveGame &&
      !activeGameId &&
      !isSearching &&
      !searchCancelled &&
      user
    ) {
      startSearch({
        userId: user.id,
        elo: user.rating || 1500,
        profileImageUrl: profile?.profileImageUrl ?? DEFAULT_AVATAR,
        username: user.username,
        time_slot: time_slot?.value!,
        isRated: isRated,
        gameMode: gameVariant,
      });
    }
  }, [
    hasCheckedActiveGame,
    isCheckingActiveGame,
    activeGameId,
    isSearching,
    searchCancelled,
    user,
    time_slot,
    isRated,
    gameVariant,
  ]);

  /* ── Sync matchData.game_id → activeGameId ───────────────────────────── */
  useEffect(() => {
    if (matchData && user && !activeGameId) {
      setActiveGameId(matchData.game_id);
    }
  }, [matchData, user, activeGameId, setActiveGameId]);

  /* ── Route to /arena/[gameId] when a new game starts ────────────────── */
  const lastRoutedId = useRef<string | null>(null);
  useEffect(() => {
    if (
      activeGameId &&
      activeGameId !== urlGameId &&
      activeGameId !== lastRoutedId.current
    ) {
      lastRoutedId.current = activeGameId;
      router.replace(`/arena/${activeGameId}`);
    }
  }, [activeGameId, urlGameId, router]);

  /* ── Action handlers ─────────────────────────────────────────────────── */
  const handleCancelSearch = (): void => {
    if (user) {
      leaveSearch(user.id);
      setSearchCancelled(true);
    }
  };

  const handleStartSearch = (): void => {
    if (!user) return;
    setSearchCancelled(false);
    startSearch({
      userId: user.id,
      elo: user.rating || 1500,
      profileImageUrl: profile?.profileImageUrl ?? "",
      username: user.username,
      time_slot: time_slot?.value!,
      isRated: isRated,
      gameMode: gameVariant,
    });
  };

  const handleDeclineResume = (): void => {
    if (user && pendingActiveGame?.gameId) {
      leaveGame(user.id, pendingActiveGame.gameId);
    }
    dismissActiveGame();
  };

  /* ── Draw flow handlers ───────────────────────────────────────────────── */
  const handleOfferDraw = (): void => {
    if (user && opponentId) offerDraw(user.id, opponentId);
  };

  const handleAcceptDrawOffer = (): void => {
    if (user) acceptDraw(user.id);
  };

  const handleDeclineDrawOffer = (): void => {
    // Routes the "your offer was declined" notice back to whoever sent it —
    // in a 1v1 game that's always the current opponent, so we use the same
    // opponentId derived above rather than drawOffer.opponentId (which is the
    // *recipient's* own id, used server-side to address the popup to us).
    if (user && opponentId) declineDraw(user.id, opponentId);
  };

  const handleResign = (): void => {
    if (user && activeGameId) {
      resign(user.id, activeGameId);
      // Stay on the page — the server will emit game_state with RESIGN
      // which triggers the game-over modal for both players.
    }
  };

  const handleAbort = (): void => {
    if (user && activeGameId) {
      abort(user.id, activeGameId);
    }
  };

  const handleReturnToLobby = (): void => {
    if (activeGameId) localStorage.removeItem(activeGameId);
    if (user && activeGameId) leaveGame(user.id, activeGameId);
    setActiveGameId(null);
    setGameState(null);
    setMovesHistory([]);
    setMatchData(null);
    router.replace("/arena");
  };

  /* ── Derived player info ─────────────────────────────────────────────── */
  // player1 = white, player2 = black (set by game-initializer)
  const myProfileImageUrl =
    profile?.profileImageUrl ||
    (isWhite
      ? gameState?.player1ProfileImageUrl
      : gameState?.player2ProfileImageUrl) ||
    DEFAULT_AVATAR;
  const opponentProfileImageUrl =
    opponentProfile?.profileImageUrl ||
    (isWhite
      ? gameState?.player2ProfileImageUrl
      : gameState?.player1ProfileImageUrl) ||
    (isWhite ? matchData?.p2.profileImageUrl : matchData?.p1.profileImageUrl) ||
    DEFAULT_AVATAR;

  const opponentInfo = {
    name: opponentProfile?.username || "Opponent",
    rating:
      (isWhite ? gameState?.player2Rating : gameState?.player1Rating) ??
      (isWhite ? matchData?.p2.elo : matchData?.p1.elo),
    profileImageUrl: opponentProfileImageUrl,
    clock: formatTime(
      isWhite ? (displayBlackTime ?? 0) : (displayWhiteTime ?? 0),
    ),
    color: isWhite ? "Black" : "White",
  };

  const currentPlayerInfo = {
    name: profile?.username || user?.username || "You",
    rating:
      (isWhite ? gameState?.player1Rating : gameState?.player2Rating) ??
      (isWhite ? matchData?.p1.elo : matchData?.p2.elo),
    profileImageUrl: myProfileImageUrl,
    clock: formatTime(
      isWhite ? (displayWhiteTime ?? 0) : (displayBlackTime ?? 0),
    ),
    color: isWhite ? "White" : "Black",
  };

  /* ── Captured pieces split ────────────────────────────────────────────
     capturedPieces[].color is the color of the CAPTURED piece.
     "Opponent's captures" = my pieces gone = same color as me.
     "My captures"         = opponent's pieces gone = opposite color.  */
  const myColor: "w" | "b" = isWhite ? "w" : "b";
  const piecesOpponentCaptured = capturedPieces.filter(
    (p) => p.color === myColor,
  );
  const piecesMeCaptured = capturedPieces.filter((p) => p.color !== myColor);

  /* ── Countdown to game start (tournament games) ──────────────────────── */
  const [secondsToStart, setSecondsToStart] = useState<number | null>(() => {
    const t = gameState?.leftGameStartTime;
    if (!t) return null;
    const s = Math.ceil((t - Date.now()) / 1000);
    return s > 0 ? s : null;
  });

  useEffect(() => {
    const t = gameState?.leftGameStartTime;
    if (!t) {
      setSecondsToStart(null);
      return;
    }

    let fired = false;
    const tick = () => {
      const s = Math.ceil((t - Date.now()) / 1000);
      setSecondsToStart(s > 0 ? s : null);
      // When countdown hits 0, sync game state from server once so the clock
      // gets authoritative remaining times and startClock() is triggered.
      if (s <= 0 && !fired && user) {
        fired = true;
        syncGameState(user.id);
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [gameState?.leftGameStartTime, user?.id, syncGameState]);

  /* ── Turn awareness ───────────────────────────────────────────────────── */
  const isOpponentTurn =
    !game.isGameOver() && game.turn() !== (isWhite ? "w" : "b");
  const isMyTurn = !game.isGameOver() && game.turn() === (isWhite ? "w" : "b");
  const isGameOver = game.isGameOver();

  /* ── Lobby clock display (shows selected time control, e.g. "3:00") ─── */
  const lobbyClockStr = `${time_slot.value?.split("+")?.[0] || "0"}:00`;

  /* ── Game result (used by modal) ─────────────────────────────────────── */
  const gameResult = useGameResult({
    game,
    gameState,
    isWhite,
    myRating: Number(currentPlayerInfo.rating) || 1500,
    opponentRating: Number(opponentInfo.rating) || 1500,
    userId: user?.id,
  });

  /* ── Check for a pending rematch request after game ends (refresh safety) */
  useEffect(() => {
    if (gameResult.isGameOver && user?.id) {
      checkRematchRequest(user.id);
    }
  }, [gameResult.isGameOver, user?.id]);

  /* ── Auth guard ───────────────────────────────────────────────────────── */
  if (user === undefined) return <ArenaLoadingShell />;

  if (user === null) {
    return (
      <div className={styles.lobbyContainer}>
        <div className={styles.lobbyCard}>
          <ShieldAlert className={styles.lobbyHeaderIcon} />
          <h2 className={styles.lobbyUsername}>Please log in</h2>
          <p style={{ color: "#7fa568" }}>
            You must be logged in to enter the matchmaking arena.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.arenaOuter}>
      <motion.div
        className={styles.arenaContainer}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {!activeGameId ? (
          /* ── Lobby: Professional Board Layout ── */
          <>
            {/* Board column */}
            <div className={styles.boardColumn}>
              <div className={styles.boardWrapper}>
                <PlayerBar
                  name="Opponent"
                  rating={null}
                  profileImageUrl=""
                  clock={lobbyClockStr}
                  position="top"
                  isLobby
                />

                <BoardUI
                  displayedFen={displayedFen}
                  isWhite={isWhite}
                  boardTheme={boardTheme}
                  onPieceDrop={() => false}
                  isLobby
                />

                <PlayerBar
                  name={currentPlayerInfo.name}
                  rating={currentPlayerInfo.rating ?? 1500}
                  profileImageUrl={currentPlayerInfo.profileImageUrl}
                  clock={lobbyClockStr}
                  position="bottom"
                  isYou
                  isLobby
                />
              </div>
            </div>

            {/* Right — find match card */}
            <div className={styles.lobbyPanel}>
              <div className={styles.lobbyCard}>
                <ArenaLobby
                  user={user}
                  profile={profile}
                  isChecking={!hasCheckedActiveGame || isCheckingActiveGame}
                  isSearching={isSearching}
                  searchStatus={searchStatus}
                  searchTimer={searchTimer}
                  searchCancelled={searchCancelled}
                  onStartSearch={handleStartSearch}
                  onCancelSearch={handleCancelSearch}
                  setTimeControl={setTimeControl}
                  setIsRatedGame={setIsRatedGame}
                  isRated={isRated}
                  time_slot={time_slot}
                  group={group}
                  gameVariant={gameVariant}
                  setGameVariant={setGameVariant}
                />
              </div>
            </div>
          </>
        ) : (
          /* Active game */
          <>
            {/* Board column */}
            <div className={styles.boardColumn}>
              <div className={styles.boardWrapper}>
                <PlayerBar
                  name={opponentInfo.name}
                  rating={opponentInfo.rating ?? 1500}
                  profileImageUrl={opponentInfo.profileImageUrl}
                  clock={opponentInfo.clock}
                  capturedPieces={piecesOpponentCaptured}
                  isActiveTurn={isOpponentTurn}
                  position="top"
                />

                {/* Board surface */}
                <BoardUI
                  displayedFen={displayedFen}
                  isWhite={isWhite}
                  boardTheme={boardTheme}
                  onPieceDrop={handleDrop}
                  onSquareClick={handleSquareClick}
                  onPieceDragBegin={handlePieceDragBegin}
                  canDragPiece={canDragPiece}
                  squareStyles={optionSquares}
                  boardArrows={boardArrows}
                  secondsToStart={secondsToStart}
                  pendingPromotion={pendingPromotion}
                  onPromotionSelect={handlePromotionSelect}
                  onCancelPromotion={handleCancelPromotion}
                  showBoardAnimation={showBoardAnimation}
                  onRevealAnimationComplete={clearBoardAnimation}
                />

                <PlayerBar
                  name={currentPlayerInfo.name}
                  rating={currentPlayerInfo.rating ?? 1500}
                  profileImageUrl={currentPlayerInfo.profileImageUrl}
                  clock={currentPlayerInfo.clock}
                  capturedPieces={piecesMeCaptured}
                  isYou
                  isActiveTurn={isMyTurn}
                  position="bottom"
                />
              </div>
            </div>

            {/* Right move panel */}
            <MoveHistoryPanel
              pairs={pairs}
              currentMoveIdx={currentMoveIdx}
              moveCount={moveHistory.length}
              isMyTurn={isMyTurn}
              scrollRef={moveScrollRef}
              gameState={gameState}
              gameId={activeGameId}
              isGameOver={isGameOver}
              onSelectMove={handleSelectMove}
              onFirstMove={handleFirstMove}
              onPreviousMove={handlePreviousMove}
              onNextMove={handleNextMove}
              onLastMove={handleLastMove}
              onResign={handleResign}
              onAbort={handleAbort}
              canAbort={moveHistory.length < 2}
              onOfferDraw={handleOfferDraw}
              isDrawOfferPending={drawOfferSent}
              onNewGame={handleReturnToLobby}
              onRematch={handleReturnToLobby}
            />
          </>
        )}
      </motion.div>

      {/* Game-over modal — shown on chess.js end or server-reported GAME_OVER (e.g. timeout) */}
      {gameResult.isGameOver && activeGameId && (
        <GameOverModal
          result={gameResult}
          currentPlayer={{
            name: currentPlayerInfo.name,
            rating: Number(currentPlayerInfo.rating) || 1500,
            profileImageUrl: currentPlayerInfo.profileImageUrl,
          }}
          opponent={{
            name: opponentInfo.name,
            rating: Number(opponentInfo.rating) || 1500,
            profileImageUrl: opponentInfo.profileImageUrl,
          }}
          onNewGame={handleReturnToLobby}
          userId={user!.id}
          opponentId={opponentId ?? ""}
          isTournament={!!gameState?.tournamentId}
          rematchStatus={rematchStatus}
          incomingRematch={incomingRematch}
          onRematchRequest={sendRematchRequest}
          onAcceptRematch={acceptRematch}
          onDeclineRematch={declineRematch}
        />
      )}

      {/* Resume prompt — shown when the server found an active game on initial join */}
      {pendingActiveGame && !activeGameId && (
        <ResumeGameModal
          pendingGame={pendingActiveGame}
          onResume={resumeActiveGame}
          onNewGame={handleDeclineResume}
        />
      )}

      {/* Draw-offer popup — no close button; the recipient must accept or decline */}
      {drawOffer && (
        <DrawRequestModal
          offer={drawOffer}
          onAccept={handleAcceptDrawOffer}
          onDecline={handleDeclineDrawOffer}
        />
      )}

      {/* Transient banner for draw-flow messages (offer sent / declined) */}
      {drawNotice && (
        <DrawNotice message={drawNotice} onDismiss={clearDrawNotice} />
      )}
    </div>
  );
}
