"use client";

import React, { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Chessboard } from "react-chessboard";
import type { BotCharacter } from "@/lib/botCharacters";
import { useBotGame } from "@/hooks/useBotGame";
import { useBoardTheme } from "@/hooks/useBoardTheme";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { PlayerBar } from "./PlayerBar";
import { MoveHistoryPanel } from "./MoveHistoryPanel";
import { PromotionPicker } from "./PromotionPicker";
import { BotSetup } from "./bot/BotSetup";
import { BotGameOverCard } from "./bot/BotGameOverCard";
import styles from "./ChessBoard.module.css";

const DEFAULT_AVATAR = "/defaultUser.jpg";
const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";

interface GameConfig {
  bot: BotCharacter;
  playerColor: "white" | "black";
  timeSlot: string;
}

export default function BotGame() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { theme } = useBoardTheme();
  const moveScrollRef = useRef<HTMLDivElement | null>(null);

  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);
  const isSetup = gameConfig === null;

  const {
    game,
    displayedFen,
    pairs,
    currentMoveIdx,
    status,
    result,
    isBotThinking,
    pendingPromotion,
    optionSquares,
    pgn,
    whiteTime,
    blackTime,
    handleDrop,
    handleSquareClick,
    handlePromotionSelect,
    handleResign,
    handleFirstMove,
    handleLastMove,
    handlePrevMove,
    handleNextMove,
    handleSelectMove,
    formatTime,
  } = useBotGame(gameConfig);

  const isGameOver = status === "over" || game.isGameOver();
  const isPlayerWhite = gameConfig?.playerColor === "white";

  const handleStartGame = useCallback(
    (bot: BotCharacter, playerColor: "white" | "black", timeSlot: string) => {
      setGameConfig({ bot, playerColor, timeSlot });
    },
    [],
  );

  const handleGoToAnalysis = useCallback(() => {
    if (pgn && gameConfig) {
      localStorage.setItem("rooky_bot_pgn", pgn);
      localStorage.setItem("rooky_bot_color", gameConfig.playerColor);
      router.push("/analysis/bot");
    }
  }, [pgn, gameConfig, router]);

  const handleNewGame = useCallback(() => {
    setGameConfig(null);
  }, []);

  /* ── Setup screen ───────────────────────────────────────────────────────── */
  if (isSetup) {
    return (
      <div className={styles.arenaOuter}>
        <BotSetup onStart={handleStartGame} />
      </div>
    );
  }

  /* ── Active game ────────────────────────────────────────────────────────── */
  const bot = gameConfig.bot;
  const playerColor = gameConfig.playerColor;

  const botTime = formatTime(playerColor === "white" ? blackTime : whiteTime);
  const userTime = formatTime(playerColor === "white" ? whiteTime : blackTime);
  const isBotTurn =
    !isGameOver && game.turn() !== (playerColor === "white" ? "w" : "b");
  const isUserTurn =
    !isGameOver && game.turn() === (playerColor === "white" ? "w" : "b");

  return (
    <div className={styles.arenaOuter}>
      <motion.div
        className={styles.arenaContainer}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Board column */}
        <div className={styles.boardColumn}>
          <div className={styles.boardWrapper}>
            <PlayerBar
              name={bot.name}
              rating={bot.elo}
              profileImageUrl=""
              clock={botTime}
              isActiveTurn={isBotTurn}
              position="top"
            />

            <div style={{ position: "relative" }}>
              <div className={styles.boardSurface}>
                <Chessboard
                  options={{
                    position: displayedFen ?? STARTING_FEN,
                    boardOrientation:
                      playerColor === "white" ? "white" : "black",
                    onPieceDrop: handleDrop,
                    onSquareClick: ({ square }) => handleSquareClick(square),
                    squareStyles: optionSquares,
                    boardStyle: { borderRadius: "0", boxShadow: "none" },
                    darkSquareStyle: { backgroundColor: theme.colors.dark },
                    lightSquareStyle: { backgroundColor: theme.colors.light },
                  }}
                />
                {pendingPromotion && (
                  <PromotionPicker
                    color={playerColor === "white" ? "w" : "b"}
                    targetSquare={pendingPromotion.to}
                    isWhiteBoard={playerColor === "white"}
                    onSelect={handlePromotionSelect}
                    onCancel={() => handlePromotionSelect("q")}
                  />
                )}
              </div>

              {isBotThinking && (
                <div style={s.thinkingBanner}>
                  <span
                    style={{
                      animation: "spin 1s linear infinite",
                      display: "inline-block",
                    }}
                  >
                    ⚙
                  </span>{" "}
                  {bot.name} is thinking…
                </div>
              )}
            </div>

            <PlayerBar
              name={profile?.username ?? user?.username ?? "You"}
              rating={user?.rating ?? 1500}
              profileImageUrl={profile?.profileImageUrl ?? DEFAULT_AVATAR}
              clock={userTime}
              isYou
              isActiveTurn={isUserTurn}
              position="bottom"
            />
          </div>
        </div>

        {/* Move history panel */}
        <MoveHistoryPanel
          pairs={pairs}
          currentMoveIdx={currentMoveIdx}
          moveCount={pairs.length * 2}
          isMyTurn={isUserTurn}
          scrollRef={moveScrollRef}
          gameState={null}
          gameId={null}
          isGameOver={isGameOver}
          onSelectMove={handleSelectMove}
          onFirstMove={handleFirstMove}
          onPreviousMove={handlePrevMove}
          onNextMove={handleNextMove}
          onLastMove={handleLastMove}
          onResign={handleResign}
          onOfferDraw={() => {}}
          onNewGame={handleNewGame}
          onRematch={handleNewGame}
        />
      </motion.div>

      {isGameOver && result && (
        <BotGameOverCard
          outcome={result.outcome}
          reason={result.reason}
          botName={bot.name}
          botAvatar={bot.avatar}
          botAccent={bot.accentColor}
          userName={profile?.username ?? user?.username ?? "You"}
          userRating={user?.rating ?? 1500}
          userAvatar={profile?.profileImageUrl ?? DEFAULT_AVATAR}
          onAnalysis={handleGoToAnalysis}
          onNewGame={handleNewGame}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  thinkingBanner: {
    position: "absolute",
    bottom: "8px",
    left: "50%",
    transform: "translateX(-50%)",
    padding: "0.3rem 0.8rem",
    background: "rgba(10,18,8,0.85)",
    border: "1px solid rgba(124,163,95,0.2)",
    borderRadius: "20px",
    color: "#8ab878",
    fontSize: "0.78rem",
    fontWeight: 600,
    whiteSpace: "nowrap",
    pointerEvents: "none",
  },
};
