"use client";

import React from "react";
import { Chessboard } from "react-chessboard";
import type { Arrow } from "react-chessboard";
import { motion } from "framer-motion";
import styles from "../ChessBoard.module.css";
import { PromotionPicker } from "../PromotionPicker";

/* ── Types ──────────────────────────────────────────────────────────── */

export interface BoardThemeColors {
  dark: string;
  light: string;
}

export interface PendingPromotion {
  color: "w" | "b";
  from: string;
  to: string;
}

/**
 * Props accepted by `BoardUI`.
 *
 * Callback signatures intentionally use `any` wrappers so the parent
 * can pass the hook return values through without re-wrapping them.
 * The Chessboard library accepts duck-typed callbacks internally.
 */
export interface BoardUIProps {
  /** Current FEN string to display */
  displayedFen: string;
  /** true when the current user is white */
  isWhite: boolean;
  /** Board colour theme */
  boardTheme: { colors: BoardThemeColors };

  /* ── Interaction callbacks ─────────────────────────────────────────── */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onPieceDrop: (...args: any[]) => boolean;
  onSquareClick?: (square: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onPieceDragBegin?: (...args: any[]) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  canDragPiece?: (...args: any[]) => boolean;

  /* ── Visual hints / arrows ────────────────────────────────────────── */
  squareStyles?: Record<string, React.CSSProperties>;
  boardArrows?: Arrow[];

  /* ── Overlays ─────────────────────────────────────────────────────── */
  /** Tournament countdown (seconds) – null = hidden */
  secondsToStart?: number | null;
  /** Promotion picker state – null = hidden */
  pendingPromotion?: PendingPromotion | null;
  onPromotionSelect?: (piece: string) => void;
  onCancelPromotion?: () => void;
  /** Board reveal animation flag */
  showBoardAnimation?: boolean;
  onRevealAnimationComplete?: () => void;

  /** Lobby mode: disable interaction */
  isLobby?: boolean;
}

/* ── Component ──────────────────────────────────────────────────────── */

export function BoardUI({
  displayedFen,
  isWhite,
  boardTheme,
  onPieceDrop,
  onSquareClick,
  onPieceDragBegin,
  canDragPiece,
  squareStyles,
  boardArrows,
  secondsToStart = null,
  pendingPromotion = null,
  onPromotionSelect,
  onCancelPromotion,
  showBoardAnimation = false,
  onRevealAnimationComplete,
  isLobby = false,
}: BoardUIProps) {
  /* Build the Chessboard options object dynamically depending on mode */
  const chessboardOptions: Record<string, unknown> = {
    position: displayedFen,
    boardOrientation: isWhite ? "white" : "black",
    boardStyle: { borderRadius: "0", boxShadow: "none" },
    darkSquareStyle: { backgroundColor: boardTheme.colors.dark },
    lightSquareStyle: { backgroundColor: boardTheme.colors.light },
  };

  if (isLobby) {
    chessboardOptions.onPieceDrop = () => false;
  } else {
    chessboardOptions.onPieceDrop = onPieceDrop;
    if (onSquareClick) {
      chessboardOptions.onSquareClick = ({ square }: { square: string }) =>
        onSquareClick(square);
    }
    if (onPieceDragBegin) chessboardOptions.onPieceDrag = onPieceDragBegin;
    if (canDragPiece) chessboardOptions.canDragPiece = canDragPiece;
    if (squareStyles) chessboardOptions.squareStyles = squareStyles;
    if (boardArrows) chessboardOptions.arrows = boardArrows;
    chessboardOptions.animationDurationInMs = 200;
    chessboardOptions.allowDrawingArrows = true;
  }

  return (
    <div className={styles.boardSurface}>
      <Chessboard options={chessboardOptions} />

      {/* Tournament start countdown */}
      {secondsToStart !== null && secondsToStart !== undefined && (
        <div className={styles.startCountdownOverlay}>
          <div className={styles.startCountdownCard}>
            <span className={styles.startCountdownLabel}>Game starts in</span>
            <span className={styles.startCountdownTime}>
              {String(Math.floor(secondsToStart / 60)).padStart(2, "0")}:
              {String(secondsToStart % 60).padStart(2, "0")}
            </span>
          </div>
        </div>
      )}

      {/* Promotion picker */}
      {pendingPromotion && onPromotionSelect && onCancelPromotion && (
        <PromotionPicker
          color={pendingPromotion.color}
          targetSquare={pendingPromotion.to}
          isWhiteBoard={isWhite}
          onSelect={onPromotionSelect}
          onCancel={onCancelPromotion}
        />
      )}

      {/* Board reveal animation */}
      {showBoardAnimation && (
        <div className={styles.boardRevealOverlay}>
          <motion.div
            className={styles.revealInitLabel}
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ delay: 0.45, duration: 0.3, ease: "easeOut" }}
          >
            Initializing game
            <span className={styles.revealInitDots}>
              <span />
              <span />
              <span />
            </span>
          </motion.div>
          <motion.div
            className={styles.revealPanelTop}
            initial={{ y: 0 }}
            animate={{ y: "-100%" }}
            transition={{ delay: 0.5, duration: 0.48, ease: "easeInOut" }}
          />
          <motion.div
            className={styles.revealPanelBottom}
            initial={{ y: 0 }}
            animate={{ y: "100%" }}
            transition={{ delay: 0.5, duration: 0.48, ease: "easeInOut" }}
            onAnimationComplete={onRevealAnimationComplete}
          />
        </div>
      )}
    </div>
  );
}
