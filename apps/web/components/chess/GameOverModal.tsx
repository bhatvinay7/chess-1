"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, X, RotateCcw, Swords, Trophy, Loader2, Check } from "lucide-react";
import styles from "./GameOverModal.module.css";
import type { GameResult } from "../../hooks/useGameResult";
import type { RematchStatus } from "../../hooks/useSocket/useGameRoom";
import type { RematchOpponent } from "@repo/socket-types";

const DEFAULT_AVATAR = "/defaultUser.jpg";
const REMATCH_WINDOW_SEC = 7;

interface Player {
  name: string;
  rating: number;
  profileImageUrl: string;
}

interface GameOverModalProps {
  result: GameResult;
  currentPlayer: Player;
  opponent: Player;
  onNewGame: () => void;
  userId: string;
  opponentId: string;
  /** True for tournament games — hides rematch controls entirely. */
  isTournament: boolean;
  rematchStatus: RematchStatus;
  incomingRematch: RematchOpponent | null;
  onRematchRequest: (userId: string, opponentId: string) => void;
  onAcceptRematch: (userId: string, opponentId: string) => void;
  onDeclineRematch: (userId: string, opponentId: string) => void;
}


function AvatarCard({ player, isWinner }: { player: Player; isWinner: boolean }) {
  const src = player.profileImageUrl || DEFAULT_AVATAR;

  return (
    <div className={styles.avatarCard}>
      <div className={styles.avatarWrap}>
        <div className={`${styles.avatarImg} ${isWinner ? styles.avatarImgWinner : ""}`}>
          <img src={src} alt={player.name} crossOrigin="anonymous" />
        </div>

        {isWinner && (
          <div className={styles.crownDot}>
            <Crown size={14} color="white" fill="white" />
          </div>
        )}
      </div>

      <span className={styles.playerName}>{player.name}</span>
    </div>
  );
}

function ScoreDisplay({
  score,
  winnerText,
}: {
  score: string;
  winnerText: string;
}) {
  return (
    <div className={styles.scoreCenter}>
      <div className={styles.scoreText}>{score}</div>
      <div className={styles.winnerInfo}>
        <Trophy size={14} />
        {winnerText}
      </div>
    </div>
  );
}

function ActionButtons({
  userId,
  opponentId,
  isTournament,
  rematchStatus,
  incomingRematch,
  onNewGame,
  onRematchRequest,
  onAcceptRematch,
  onDeclineRematch,
}: {
  userId: string;
  opponentId: string;
  isTournament: boolean;
  rematchStatus: RematchStatus;
  incomingRematch: RematchOpponent | null;
  onNewGame: () => void;
  onRematchRequest: (userId: string, opponentId: string) => void;
  onAcceptRematch: (userId: string, opponentId: string) => void;
  onDeclineRematch: (userId: string, opponentId: string) => void;
}) {
  const [timeLeft, setTimeLeft] = useState(REMATCH_WINDOW_SEC);

  useEffect(() => {
    if (isTournament || rematchStatus !== "idle") return;
    if (timeLeft <= 0) return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(id); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [rematchStatus, isTournament]);

  // Tournament games: only New Game, no rematch options
  if (isTournament) {
    return (
      <div className={styles.actions}>
        <button className={styles.btnNewGame} onClick={onNewGame} type="button">
          <RotateCcw size={16} />
          Back to Lobby
        </button>
      </div>
    );
  }

  // Receiver of a rematch request
  if (rematchStatus === "incoming") {
    const fromName = incomingRematch?.username ?? "Opponent";
    return (
      <div className={styles.actions}>
        <div className={styles.incomingBanner}>
          <span className={styles.incomingText}>{fromName} wants a rematch</span>
          <div className={styles.incomingBtns}>
            <button
              className={styles.btnAccept}
              onClick={() => onAcceptRematch(userId, opponentId)}
              type="button"
            >
              <Check size={15} />
              Accept
            </button>
            <button
              className={styles.btnDecline}
              onClick={() => onDeclineRematch(userId, opponentId)}
              type="button"
            >
              Decline
            </button>
          </div>
        </div>
        <button className={styles.btnNewGame} onClick={onNewGame} type="button">
          <RotateCcw size={16} />
          New Game
        </button>
      </div>
    );
  }

  // Sender waiting for response
  if (rematchStatus === "requesting") {
    return (
      <div className={styles.actions}>
        <button className={styles.btnWaiting} disabled type="button">
          <Loader2 size={16} className={styles.spinnerIcon} />
          Waiting…
        </button>
        <button className={styles.btnNewGame} onClick={onNewGame} type="button">
          <RotateCcw size={16} />
          New Game
        </button>
      </div>
    );
  }

  const canRematch = timeLeft > 0;
  return (
    <div className={styles.actions}>
      <button
        className={canRematch ? styles.btnRematch : styles.btnRematchExpired}
        disabled={!canRematch}
        onClick={() => canRematch && onRematchRequest(userId, opponentId)}
        type="button"
      >
        <Swords size={16} />
        Rematch
        {canRematch && <span className={styles.timerBadge}>{timeLeft}</span>}
      </button>
      <button className={styles.btnNewGame} onClick={onNewGame} type="button">
        <RotateCcw size={16} />
        New Game
      </button>
    </div>
  );
}

/* ── Main modal ──────────────────────────────────────────────── */

export function GameOverModal({
  result,
  currentPlayer,
  opponent,
  onNewGame,
  userId,
  opponentId,
  isTournament,
  rematchStatus,
  incomingRematch,
  onRematchRequest,
  onAcceptRematch,
  onDeclineRematch,
}: GameOverModalProps) {
  const { didLocalPlayerWin, resultLabel } = result;

  const isDraw = didLocalPlayerWin === null;
  const localWon = didLocalPlayerWin === true;
  const opponentWon = didLocalPlayerWin === false;

  const score = isDraw ? "½ - ½" : localWon ? "1 - 0" : "0 - 1";
  const winnerText = isDraw ? "Draw" : localWon ? currentPlayer.name : opponent.name;

  return (
    <AnimatePresence>
      <motion.div
        className={styles.backdrop}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
      >
        <motion.div
          className={styles.modal}
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
        >
          <button className={styles.closeBtn} onClick={onNewGame} type="button" aria-label="Close">
            <X size={20} color="#ffffff" />
          </button>

          <div className={styles.header}>
            <h1 className={styles.headerTitle}>Game Over</h1>
            <span className={styles.headerSub}>by {resultLabel}</span>
          </div>

          <div className={styles.body}>
            <div className={styles.playersRow}>
              <AvatarCard player={currentPlayer} isWinner={localWon} />
              <ScoreDisplay score={score} winnerText={winnerText} />
              <AvatarCard player={opponent} isWinner={opponentWon} />
            </div>

            <ActionButtons
              userId={userId}
              opponentId={opponentId}
              isTournament={isTournament}
              rematchStatus={rematchStatus}
              incomingRematch={incomingRematch}
              onNewGame={onNewGame}
              onRematchRequest={onRematchRequest}
              onAcceptRematch={onAcceptRematch}
              onDeclineRematch={onDeclineRematch}
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default GameOverModal;
