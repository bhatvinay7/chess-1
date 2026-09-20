"use client";

import React, { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import styles from "./SpectatorBoard.module.css";
import { MoveHistoryPanel } from "./MoveHistoryPanel";
import { useBoardTheme } from "../../hooks/useBoardTheme";
import { useSpectateGame } from "../../hooks/useSpectateGame";
import { useChessTimer } from "../../hooks/useClockTime";

const DEFAULT_AVATAR = "/defaultUser.jpg";

// ── Result helpers ────────────────────────────────────────────────────────────

function resolveResult(
  gameState: string,
  winnerId: string | null | undefined,
  whiteId: string | null | undefined,
) {
  const win =
    gameState.includes("WHITE_WIN") ||
    (gameState === "RESIGN" && winnerId === whiteId)
      ? "white"
      : gameState.includes("BLACK_WIN") ||
          (gameState === "RESIGN" && winnerId && winnerId !== whiteId)
        ? "black"
        : null;

  const isDraw =
    !win &&
    (gameState === "DRAW" ||
      gameState === "STALEMATE" ||
      gameState === "DRAW_BY_AGREEMENT" ||
      gameState === "GAME_OVER" ||
      gameState === "CHECKMATE"); // fallback — check winnerId

  if (gameState === "CHECKMATE" && winnerId === whiteId)
    return { winner: "white" as const, label: "Checkmate" };
  if (gameState === "CHECKMATE" && winnerId)
    return { winner: "black" as const, label: "Checkmate" };
  if (gameState.includes("WHITE_WIN"))
    return {
      winner: "white" as const,
      label: gameState.includes("TIMEOUT") ? "Timeout" : "Win",
    };
  if (gameState.includes("BLACK_WIN"))
    return {
      winner: "black" as const,
      label: gameState.includes("TIMEOUT") ? "Timeout" : "Win",
    };
  if (gameState === "RESIGN")
    return {
      winner: winnerId === whiteId ? ("white" as const) : ("black" as const),
      label: "Resignation",
    };
  if (gameState === "STALEMATE") return { winner: null, label: "Stalemate" };
  if (gameState === "DRAW" || gameState === "DRAW_BY_AGREEMENT")
    return { winner: null, label: "Draw" };
  if (gameState === "ABANDONED") return { winner: null, label: "Abandoned" };
  // GAME_OVER with a winner
  if (winnerId === whiteId) return { winner: "white" as const, label: "Win" };
  if (winnerId) return { winner: "black" as const, label: "Win" };
  return { winner: null, label: "Draw" };
}

// ── SpectatorGameOver popup ───────────────────────────────────────────────────

function SpectatorGameOver({
  gameState,
  winnerId,
  white,
  black,
  whiteId,
  onDismiss,
  onAnalyse,
}: {
  gameState: string;
  winnerId: string | null | undefined;
  white: { name: string; img?: string | null };
  black: { name: string; img?: string | null };
  whiteId: string | null | undefined;
  onDismiss: () => void;
  onAnalyse: () => void;
}) {
  const { winner, label } = resolveResult(gameState, winnerId, whiteId);
  const isDraw = winner === null;
  const winnerInfo =
    winner === "white" ? white : winner === "black" ? black : null;

  const emoji = isDraw ? "🤝" : "🏆";
  const title = isDraw
    ? "Draw"
    : `${winner === "white" ? "White" : "Black"} Wins!`;

  return (
    <div className={styles.gameOverOverlay}>
      <div className={styles.gameOverCard}>
        <div className={styles.gameOverEmoji}>{emoji}</div>
        <div className={styles.gameOverTitle}>{title}</div>
        <div className={styles.gameOverBy}>by {label}</div>

        {winnerInfo && (
          <div className={styles.gameOverWinner}>
            <div className={styles.gameOverWinnerAvatar}>
              <img
                src={winnerInfo.img || DEFAULT_AVATAR}
                alt={winnerInfo.name}
                crossOrigin="anonymous"
              />
            </div>
            {winnerInfo.name}
          </div>
        )}

        <div className={styles.gameOverActions}>
          <button
            type="button"
            className={styles.gameOverAnalyse}
            onClick={onAnalyse}
          >
            Analyse
          </button>
          <button
            type="button"
            className={styles.gameOverDismiss}
            onClick={onDismiss}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ── SpectatorPlayerBar ────────────────────────────────────────────────────────

function SpectatorPlayerBar({
  name,
  rating,
  profileImageUrl,
  clock,
  isActiveTurn,
  position,
}: {
  name: string;
  rating?: string | null;
  profileImageUrl?: string | null;
  clock: string;
  isActiveTurn: boolean;
  position: "top" | "bottom";
}) {
  return (
    <div
      className={`${styles.playerBar} ${position === "top" ? styles.playerBarTop : styles.playerBarBottom}`}
    >
      <div className={styles.playerLeft}>
        <div className={styles.avatar}>
          <img
            src={profileImageUrl || DEFAULT_AVATAR}
            alt={name}
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              objectFit: "cover",
            }}
            crossOrigin="anonymous"
          />
        </div>
        <div className={styles.playerMiddle}>
          <span className={styles.playerName}>
            {name}
            <span className={styles.playerRatingInline}>
              {" "}
              ({rating ?? "—"})
            </span>
          </span>
        </div>
      </div>
      <div
        className={`${styles.timer} ${isActiveTurn ? styles.timerActive : ""}`}
      >
        {clock}
      </div>
    </div>
  );
}

// ── SpectatorBoard ────────────────────────────────────────────────────────────

interface SpectatorBoardProps {
  gameId: string;
}

const noop = () => {};

export function SpectatorBoard({ gameId }: SpectatorBoardProps) {
  const router = useRouter();
  const { theme: boardTheme } = useBoardTheme();
  const {
    spectateState,
    movePairs,
    moveCount,
    serverTimes,
    spectatorCount,
    connected,
    gameRef,
  } = useSpectateGame(gameId);

  const moveScrollRef = useRef<HTMLDivElement | null>(null);
  const [gameOverDismissed, setGameOverDismissed] = useState(false);

  const currentFen = spectateState?.currentFen ?? "start";
  const gameState = spectateState?.gameState ?? "";
  const isActive = gameState === "IN_PROGRESS" || gameState === "INITIALIZED";
  const isGameOver = !isActive && !!gameState;

  // Reset popup when game transitions back to active
  React.useEffect(() => {
    if (isActive) setGameOverDismissed(false);
  }, [isActive]);

  const chessTurn = useMemo(() => {
    try {
      return new Chess(currentFen).turn();
    } catch {
      return "w" as const;
    }
  }, [currentFen]);
  const isWhiteToMove = chessTurn === "w";

  // Clock — spectators view only, no timeout callback
  const { displayWhiteTime, displayBlackTime, syncTimeFromOutside } =
    useChessTimer(
      spectateState?.time_slot ?? "5",
      String(spectateState?.whitePlayerLeftTime ?? 300),
      String(spectateState?.blackPlayerLeftTime ?? 300),
      isActive ? gameId : null,
      gameRef.current,
    );

  React.useEffect(() => {
    if (!serverTimes) return;
    syncTimeFromOutside(serverTimes.white, serverTimes.black);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverTimes]);

  // Derive white/black player info from the game state
  const isP1White = spectateState?.whitePlayerId === spectateState?.player1Id;

  const white = {
    name: isP1White
      ? (spectateState?.player1Username ?? "White")
      : (spectateState?.player2Username ?? "White"),
    rating: isP1White
      ? spectateState?.player1Rating
      : spectateState?.player2Rating,
    img: isP1White
      ? spectateState?.player1ProfileImageUrl
      : spectateState?.player2ProfileImageUrl,
  };
  const black = {
    name: isP1White
      ? (spectateState?.player2Username ?? "Black")
      : (spectateState?.player1Username ?? "Black"),
    rating: isP1White
      ? spectateState?.player2Rating
      : spectateState?.player1Rating,
    img: isP1White
      ? spectateState?.player2ProfileImageUrl
      : spectateState?.player1ProfileImageUrl,
  };

  if (!connected) {
    return (
      <div className={styles.outer}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Connecting to game…</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.outer}>
      <div className={styles.container}>
        {/* ── Board column ── */}
        <div className={styles.boardColumn}>
          <div className={styles.spectateBadge}>
            <span className={styles.spectateDot} />
            Spectating
            {spectatorCount > 1 && ` · ${spectatorCount} watching`}
          </div>

          <div className={styles.boardWrapper}>
            <SpectatorPlayerBar
              name={black.name}
              rating={black.rating}
              profileImageUrl={black.img}
              clock={formatTime(displayBlackTime)}
              isActiveTurn={isActive && !isWhiteToMove}
              position="top"
            />

            {/* Read-only board */}
            <div style={{ position: "relative" }}>
              <Chessboard
                options={{
                  position: currentFen,
                  boardOrientation: "white",
                  boardStyle: { borderRadius: "0", boxShadow: "none" },
                  darkSquareStyle: { backgroundColor: boardTheme.colors.dark },
                  lightSquareStyle: {
                    backgroundColor: boardTheme.colors.light,
                  },
                  onPieceDrop: () => false,
                }}
              />

              {/* Game-over overlay */}
              {isGameOver && !gameOverDismissed && spectateState && (
                <SpectatorGameOver
                  gameState={gameState}
                  winnerId={spectateState.winnerId}
                  white={white}
                  black={black}
                  whiteId={spectateState.whitePlayerId}
                  onDismiss={() => setGameOverDismissed(true)}
                  onAnalyse={() => router.push(`/analysis/${gameId}`)}
                />
              )}
            </div>

            <SpectatorPlayerBar
              name={white.name}
              rating={white.rating}
              profileImageUrl={white.img}
              clock={formatTime(displayWhiteTime)}
              isActiveTurn={isActive && isWhiteToMove}
              position="bottom"
            />
          </div>
        </div>

        {/* ── Move history panel ── */}
        <MoveHistoryPanel
          pairs={movePairs}
          currentMoveIdx={movePairs.length - 1}
          moveCount={moveCount}
          isMyTurn={false}
          isSpectator
          scrollRef={moveScrollRef}
          gameState={spectateState}
          gameId={gameId}
          isGameOver={isGameOver}
          onSelectMove={noop}
          onFirstMove={noop}
          onPreviousMove={noop}
          onNextMove={noop}
          onLastMove={noop}
          onResign={noop}
          onOfferDraw={noop}
          onNewGame={noop}
          onRematch={noop}
          onAnalyse={() => router.push(`/analysis/${gameId}`)}
        />
      </div>
    </div>
  );
}
