"use client";

import React, { useRef, useEffect, type CSSProperties } from "react";
import { Chessboard } from "react-chessboard";
import type { Arrow } from "react-chessboard";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  BookOpen,
  Brain,
  RotateCcw,
  Flag,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  GraduationCap,
} from "lucide-react";
import {
  useCoachGame,
  type CoachGameConfig,
  type BookHint,
  type MoveAnnotation,
} from "@/hooks/useCoachGame";
import { useBoardTheme } from "@/hooks/useBoardTheme";
import { PromotionPicker } from "../PromotionPicker";
import styles from "./CoachBoard.module.css";

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/* ── helpers ───────────────────────────────────────────────────────── */

function buildArrows(hints: BookHint[]): Arrow[] {
  if (hints.length === 0) return [];
  return hints.map((h) => ({
    startSquare: h.from,
    endSquare: h.to,
    color: "rgba(80,200,120,0.7)",
  })) as Arrow[];
}

function buildBookSquares(hints: BookHint[]): Record<string, CSSProperties> {
  const sq: Record<string, CSSProperties> = {};
  hints.forEach((h) => {
    sq[h.to] = {
      background:
        "radial-gradient(circle, rgba(80,200,120,0.35) 55%, transparent 56%)",
      borderRadius: "50%",
    };
  });
  return sq;
}

/* ── spring presets ─────────────────────────────────────────────────── */
const spring = { type: "spring", stiffness: 420, damping: 28 } as const;
const springBouncy = { type: "spring", stiffness: 520, damping: 22 } as const;

/* ── CoachTeachPopup ─────────────────────────────────────────────────
   Overlay that appears when the user or engine plays a book move.
   Sits at the top-center of the board.
──────────────────────────────────────────────────────────────────────── */
interface PopupProps {
  annotation: MoveAnnotation;
}

function CoachTeachPopup({ annotation }: PopupProps) {
  const reduced = useReducedMotion();
  const isUser = annotation.side === "user";
  const isBook = annotation.isBook;

  const bg = isBook
    ? "linear-gradient(135deg, rgba(20,44,20,0.97), rgba(30,60,30,0.97))"
    : "linear-gradient(135deg, rgba(44,38,16,0.97), rgba(60,52,20,0.97))";
  const border = isBook ? "rgba(80,200,120,0.45)" : "rgba(255,200,80,0.35)";
  const accent = isBook ? "#50c878" : "#ffc850";

  return (
    <motion.div
      key={`${annotation.san}-${annotation.openingName}-${annotation.side}`}
      initial={reduced ? { opacity: 0 } : { y: -32, opacity: 0, scale: 0.88 }}
      animate={reduced ? { opacity: 1 } : { y: 0, opacity: 1, scale: 1 }}
      exit={reduced ? { opacity: 0 } : { y: -16, opacity: 0, scale: 0.92 }}
      transition={springBouncy}
      style={{
        position: "absolute",
        top: "0.65rem",
        left: "50%",
        x: "-50%",
        zIndex: 20,
        background: bg,
        border: `1.5px solid ${border}`,
        borderRadius: "12px",
        padding: "0.7rem 1.1rem",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${border}`,
        backdropFilter: "blur(8px)",
        minWidth: "220px",
        maxWidth: "340px",
        pointerEvents: "none",
      }}
    >
      {/* Coach avatar pulse */}
      <motion.div
        animate={isBook && !reduced ? { scale: [1, 1.15, 1] } : {}}
        transition={{ repeat: 2, duration: 0.4 }}
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: isBook
            ? "linear-gradient(135deg,#2a3d28,#1a2416)"
            : "linear-gradient(135deg,#3d3214,#241e0a)",
          border: `2px solid ${border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.2rem",
          flexShrink: 0,
        }}
      >
        {isBook ? (isUser ? "✓" : "♟") : "◆"}
      </motion.div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Tag line */}
        <div
          style={{
            fontSize: "0.7rem",
            fontWeight: 700,
            color: accent,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: "0.2rem",
            display: "flex",
            alignItems: "center",
            gap: "0.3rem",
          }}
        >
          {isBook ? (
            isUser ? (
              <>✓ Perfect book move!</>
            ) : (
              <>
                <GraduationCap size={11} /> Coach teaches:{" "}
              </>
            )
          ) : (
            <>
              <Sparkles size={11} /> Novelty — off book
            </>
          )}
        </div>
        {/* Move */}
        <div
          style={{ display: "flex", alignItems: "baseline", gap: "0.45rem" }}
        >
          <span
            style={{
              fontFamily: "monospace",
              fontWeight: 800,
              fontSize: "1.05rem",
              color: "#fff",
            }}
          >
            {annotation.san}
          </span>
          {annotation.openingName && (
            <span
              style={{
                fontSize: "0.74rem",
                color: "rgba(255,255,255,0.45)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              · {annotation.openingName}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ── main component ──────────────────────────────────────────────────── */

interface CoachBoardProps {
  config: CoachGameConfig;
  onQuit: () => void;
}

export function CoachBoard({ config, onQuit }: CoachBoardProps) {
  const { theme } = useBoardTheme();
  const moveScrollRef = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();

  const {
    game,
    displayedFen,
    pairs,
    currentMoveIdx,
    status,
    result,
    isEngineThinking,
    pendingPromotion,
    optionSquares,
    bookHints,
    lastMoveAnnotation,
    handleDrop,
    handleSquareClick,
    handlePromotionSelect,
    handleResign,
    handleNewGame,
    handleFirstMove,
    handleLastMove,
    handlePrevMove,
    handleNextMove,
    handleSelectMove,
  } = useCoachGame(config);

  const isPlayerWhite = config.playerColor === "white";

  /* auto-scroll move list */
  useEffect(() => {
    if (moveScrollRef.current && currentMoveIdx >= 0) {
      const active = moveScrollRef.current.querySelector(
        "[data-active='true']",
      );
      active?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [currentMoveIdx]);

  const bookSq = buildBookSquares(bookHints);
  const mergedSq = { ...bookSq, ...optionSquares };
  const arrows = buildArrows(bookHints);

  const history = game.history({ verbose: true });
  const lastMove = history[currentMoveIdx] ?? history[history.length - 1];
  const lastMoveSq: Record<string, CSSProperties> = lastMove
    ? {
        [lastMove.from]: { background: "rgba(255,213,0,0.22)" },
        [lastMove.to]: { background: "rgba(255,213,0,0.30)" },
      }
    : {};

  const allCustomSquares = { ...lastMoveSq, ...mergedSq };

  /* show popup only for last annotation */
  const showPopup = !!lastMoveAnnotation;
  const annotationKey = lastMoveAnnotation
    ? `${lastMoveAnnotation.san}-${lastMoveAnnotation.openingName}-${lastMoveAnnotation.side}`
    : null;

  return (
    <div className={styles.layout}>
      {/* ── board column ── */}
      <div className={styles.boardCol}>
        {/* Coach header */}
        <motion.div
          className={styles.coachHeader}
          initial={reduced ? {} : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.05 }}
        >
          <motion.span
            className={styles.coachAvatarSmall}
            animate={
              isEngineThinking && !reduced
                ? { scale: [1, 1.1, 1] }
                : { scale: 1 }
            }
            transition={{ repeat: Infinity, duration: 1.2 }}
          >
            ♟
          </motion.span>
          <div>
            <div className={styles.coachLabel}>Coach Chatur</div>
            <div className={styles.openingLabel}>
              {config.opening.name} · {config.opening.eco}
            </div>
          </div>
          <AnimatePresence>
            {isEngineThinking && (
              <motion.div
                className={styles.thinkingBadge}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={spring}
              >
                <Brain
                  size={13}
                  style={{ animation: "spin 1.2s linear infinite" }}
                />
                Thinking…
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Board + floating popup */}
        <div className={styles.boardWrap}>
          <Chessboard
            options={{
              position: displayedFen ?? STARTING_FEN,
              boardOrientation: isPlayerWhite ? "white" : "black",
              onPieceDrop: handleDrop,
              onSquareClick: ({ square }) => handleSquareClick(square),
              squareStyles: allCustomSquares,
              arrows,
              boardStyle: {
                borderRadius: "8px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              },
              darkSquareStyle: { backgroundColor: theme.colors.dark },
              lightSquareStyle: { backgroundColor: theme.colors.light },
            }}
          />

          {/* Coach popup overlay */}
          <AnimatePresence>
            {showPopup && lastMoveAnnotation && (
              <CoachTeachPopup
                key={annotationKey!}
                annotation={lastMoveAnnotation}
              />
            )}
          </AnimatePresence>

          {pendingPromotion && (
            <PromotionPicker
              color={isPlayerWhite ? "w" : "b"}
              targetSquare={pendingPromotion.to}
              isWhiteBoard={isPlayerWhite}
              onSelect={handlePromotionSelect}
              onCancel={() => handlePromotionSelect("q")}
            />
          )}
        </div>

        {/* Nav controls */}
        <motion.div
          className={styles.navRow}
          initial={reduced ? {} : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.1 }}
        >
          <button
            type="button"
            onClick={handleFirstMove}
            className={styles.navBtn}
            title="First"
          >
            <ChevronFirst size={16} />
          </button>
          <button
            type="button"
            onClick={handlePrevMove}
            className={styles.navBtn}
            title="Prev"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={handleNextMove}
            className={styles.navBtn}
            title="Next"
          >
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            onClick={handleLastMove}
            className={styles.navBtn}
            title="Last"
          >
            <ChevronLast size={16} />
          </button>

          {status === "playing" ? (
            <button
              type="button"
              onClick={handleResign}
              className={`${styles.navBtn} ${styles.resignBtn}`}
              title="Resign"
            >
              <Flag size={15} />
            </button>
          ) : (
            <motion.button
              type="button"
              onClick={handleNewGame}
              className={`${styles.navBtn} ${styles.newGameBtn}`}
              title="New Game"
              whileHover={reduced ? {} : { scale: 1.1 }}
              whileTap={reduced ? {} : { scale: 0.95 }}
            >
              <RotateCcw size={15} />
            </motion.button>
          )}

          <button type="button" onClick={onQuit} className={styles.quitBtn}>
            Change Opening
          </button>
        </motion.div>
      </div>

      {/* ── info column ── */}
      <div className={styles.infoCol}>
        {/* Game over card */}
        <AnimatePresence>
          {status === "over" && result && (
            <motion.div
              key="result"
              className={`${styles.resultCard} ${result.outcome === "win" ? styles.resultWin : result.outcome === "loss" ? styles.resultLoss : styles.resultDraw}`}
              initial={
                reduced ? { opacity: 0 } : { opacity: 0, scale: 0.8, y: 20 }
              }
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={springBouncy}
            >
              <motion.div
                className={styles.resultEmoji}
                initial={reduced ? {} : { scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ ...springBouncy, delay: 0.15 }}
              >
                {result.outcome === "win"
                  ? "🏆"
                  : result.outcome === "loss"
                    ? "💡"
                    : "🤝"}
              </motion.div>
              <div className={styles.resultText}>
                {result.outcome === "win"
                  ? "You Won!"
                  : result.outcome === "loss"
                    ? "Good effort!"
                    : "Draw"}
              </div>
              <div className={styles.resultReason}>{result.reason}</div>
              <motion.button
                type="button"
                onClick={handleNewGame}
                className={styles.rematchBtn}
                whileHover={reduced ? {} : { scale: 1.05 }}
                whileTap={reduced ? {} : { scale: 0.97 }}
              >
                <RotateCcw size={14} /> Play Again
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Book hints panel */}
        <AnimatePresence>
          {bookHints.length > 0 &&
            status === "playing" &&
            !isEngineThinking && (
              <motion.div
                className={styles.hintsPanel}
                initial={reduced ? { opacity: 0 } : { opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={spring}
              >
                <div className={styles.hintsPanelTitle}>
                  <BookOpen size={14} />
                  Book Moves for This Position
                </div>
                {bookHints.map((h, i) => (
                  <motion.div
                    key={h.san}
                    className={styles.hintRow}
                    initial={reduced ? { opacity: 0 } : { opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ ...spring, delay: i * 0.05 }}
                  >
                    <span className={styles.hintSan}>{h.san}</span>
                    <span className={styles.hintName}>{h.openingName}</span>
                  </motion.div>
                ))}
              </motion.div>
            )}
        </AnimatePresence>

        {/* Move history */}
        <div className={styles.historyPanel} ref={moveScrollRef}>
          <div className={styles.historyTitle}>Move History</div>
          {pairs.length === 0 ? (
            <p className={styles.historyEmpty}>Game starts here. Your turn!</p>
          ) : (
            <div className={styles.historyGrid}>
              {pairs.map((pair, i) => {
                const whiteIdx = i * 2;
                const blackIdx = i * 2 + 1;
                const isNewest = i === pairs.length - 1;
                return (
                  <React.Fragment key={i}>
                    <span className={styles.moveNum}>{i + 1}.</span>
                    <motion.button
                      type="button"
                      data-active={currentMoveIdx === whiteIdx}
                      className={`${styles.moveSan} ${currentMoveIdx === whiteIdx ? styles.moveSanActive : ""}`}
                      onClick={() => handleSelectMove(whiteIdx)}
                      initial={
                        reduced || !isNewest ? false : { opacity: 0, x: -8 }
                      }
                      animate={{ opacity: 1, x: 0 }}
                      transition={spring}
                    >
                      {pair.white}
                    </motion.button>
                    {pair.black ? (
                      <motion.button
                        type="button"
                        data-active={currentMoveIdx === blackIdx}
                        className={`${styles.moveSan} ${currentMoveIdx === blackIdx ? styles.moveSanActive : ""}`}
                        onClick={() => handleSelectMove(blackIdx)}
                        initial={
                          reduced || !isNewest ? false : { opacity: 0, x: -8 }
                        }
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ ...spring, delay: 0.06 }}
                      >
                        {pair.black}
                      </motion.button>
                    ) : (
                      <span />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        {/* Opening info */}
        <motion.div
          className={styles.openingInfo}
          initial={reduced ? {} : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.12 }}
        >
          <div className={styles.openingInfoEmoji}>{config.opening.emoji}</div>
          <div>
            <div className={styles.openingInfoName}>{config.opening.name}</div>
            <div className={styles.openingInfoDesc}>
              {config.opening.description}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
