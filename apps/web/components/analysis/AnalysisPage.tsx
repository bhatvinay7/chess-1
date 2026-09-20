"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Chessboard, type SquareRenderer } from "react-chessboard";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useAnalysis, type MoveEvaluation } from "../../hooks/useAnalysis";
import type { GameDetail } from "../../app/lib/api/analysis";
import { saveAnalysis } from "../../app/lib/api/analysis";
import { useBoardTheme } from "../../hooks/useBoardTheme";
import { QUALITY } from "./constants";
import { squareToBadgeStyle } from "./utils";
import { accuracyColor } from "./utils";
import { useClickToMove } from "./useClickToMove";
import { EvalBar } from "./EvalBar";
import { PromotionDialog } from "./PromotionDialog";
import { AnalysisPanel } from "./AnalysisPanel";
import { PlayModePanel } from "./PlayModePanel";
import { BoardControls } from "./BoardControls";
import { AccuracySection } from "./AccuracySection";
import styles from "./Analysis.module.css";

export function AnalysisPage({
  game,
  skipBackend = false,
}: {
  game: GameDetail;
  skipBackend?: boolean;
}) {
  const router = useRouter();
  const { theme } = useBoardTheme();
  const [savedAccuracy, setSavedAccuracy] = useState(false);
  const moveListRef = useRef<HTMLDivElement | null>(null);
  const autoStarted = useRef(false);
  const alreadyAnalyzed = !!game.analysis?.reviewedAt;

  const {
    isAnalyzing,
    analysisProgress,
    analysisResult,
    startAnalysis,
    currentPly,
    maxPly,
    positions,
    goToMove,
    goFirst,
    goLast,
    goPrev,
    goNext,
    goNextUserMove,
    activeFen,
    boardOrientation,
    flipBoard,
    evalWhite,
    currentTopMoves,
    playMode,
    enterPlayMode,
    exitPlayMode,
    handlePlayMove,
    playMoves,
    playStartFen,
    playTopMoves,
    isEngineThinking,
  } = useAnalysis({
    pgn: game.pgn,
    playerColor: game.playerColor,
    gameMode: game.gameMode,
  });

  // ── Click-to-move ─────────────────────────────────────────────────────────
  const {
    selectedSquare,
    validDests,
    captureDests,
    promotionPending,
    onSquareClick,
    onPromotionSelect,
    cancelPromotion,
    clearSelection,
  } = useClickToMove({ activeFen, playMode, isEngineThinking, handlePlayMove });

  const promotingColor: "white" | "black" = useMemo(() => {
    if (!promotionPending) return "white";
    return promotionPending.to.charAt(1) === "8" ? "white" : "black";
  }, [promotionPending]);

  // ── Side effects ──────────────────────────────────────────────────────────

  // Auto-load annotations for already-reviewed games
  useEffect(() => {
    if (!alreadyAnalyzed || autoStarted.current || positions.length === 0)
      return;
    autoStarted.current = true;
    startAnalysis();
  }, [alreadyAnalyzed, positions.length, startAnalysis]);

  // Persist accuracy to DB once (new game only, never for bot/local games)
  useEffect(() => {
    if (!analysisResult || savedAccuracy || alreadyAnalyzed || skipBackend)
      return;
    setSavedAccuracy(true);
    saveAnalysis(
      game.id,
      analysisResult.whiteAccuracy,
      analysisResult.blackAccuracy,
    ).catch(console.error);
  }, [analysisResult, game.id, savedAccuracy, alreadyAnalyzed, skipBackend]);

  // Keyboard navigation (analysis mode only)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (playMode !== "analysis") return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
      if (e.key === "Home") {
        e.preventDefault();
        goFirst();
      }
      if (e.key === "End") {
        e.preventDefault();
        goLast();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playMode, goPrev, goNext, goFirst, goLast]);

  // Scroll active move into view
  useEffect(() => {
    moveListRef.current
      ?.querySelector(`[data-ply="${currentPly}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentPly]);

  // ── Board state (analysis mode) ───────────────────────────────────────────

  const currentMoveEval = useMemo(
    () => analysisResult?.moves.find((m) => m.ply === currentPly),
    [analysisResult, currentPly],
  );

  const squareStyles = useMemo<Record<string, React.CSSProperties>>(() => {
    if (playMode !== "analysis") {
      if (!selectedSquare) return {};
      return {
        [selectedSquare]: {
          background: "rgba(20,85,30,0.55)",
          boxShadow: "inset 0 0 0 3px rgba(129,182,76,0.85)",
        },
      };
    }
    const sq: Record<string, React.CSSProperties> = {};
    if (!currentMoveEval) return sq;
    const { moveUci, quality, engineBestUci } = currentMoveEval;
    const q = QUALITY[quality];
    sq[moveUci.slice(0, 2)] = { background: `${q.color}33` };
    sq[moveUci.slice(2, 4)] = { background: `${q.color}55` };
    if (
      engineBestUci &&
      engineBestUci !== moveUci &&
      engineBestUci.length >= 4
    ) {
      sq[engineBestUci.slice(0, 2)] = { background: "rgba(129,182,76,0.25)" };
      sq[engineBestUci.slice(2, 4)] = { background: "rgba(129,182,76,0.4)" };
    }
    return sq;
  }, [playMode, selectedSquare, currentMoveEval]);

  const arrows = useMemo(() => {
    if (playMode !== "analysis") return [];
    const arr: { startSquare: string; endSquare: string; color: string }[] = [];
    if (currentMoveEval) {
      const { moveUci, engineBestUci, quality } = currentMoveEval;
      if (
        engineBestUci &&
        engineBestUci !== moveUci &&
        engineBestUci.length >= 4
      )
        arr.push({
          startSquare: engineBestUci.slice(0, 2),
          endSquare: engineBestUci.slice(2, 4),
          color: "#81b64c",
        });
      if (moveUci.length >= 4)
        arr.push({
          startSquare: moveUci.slice(0, 2),
          endSquare: moveUci.slice(2, 4),
          color: QUALITY[quality].color,
        });
    } else {
      ["#81b64c", "#6db0d6", "#e8c44a"].forEach((color, i) => {
        const tm = currentTopMoves[i];
        if (tm && tm.moveUci && tm.moveUci.length >= 4)
          arr.push({
            startSquare: tm.moveUci.slice(0, 2),
            endSquare: tm.moveUci.slice(2, 4),
            color,
          });
      });
    }
    return arr;
  }, [currentMoveEval, currentTopMoves, playMode]);

  const badgeStyle = useMemo(
    () =>
      currentMoveEval
        ? squareToBadgeStyle(
            currentMoveEval.moveUci.slice(2, 4),
            boardOrientation,
          )
        : {},
    [currentMoveEval, boardOrientation],
  );

  // ── Square renderer: animated dots + capture rings (play mode only) ────────
  const squareRenderer = useCallback<SquareRenderer>(
    ({ square, children }) => {
      const isValidDest =
        playMode !== "analysis" &&
        validDests.has(square) &&
        square !== selectedSquare;
      return (
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {children}
          {isValidDest &&
            (captureDests.has(square) ? (
              <div className={styles.captureRing} />
            ) : (
              <div className={styles.moveDot} />
            ))}
        </div>
      );
    },
    [playMode, validDests, captureDests, selectedSquare],
  );

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const canDragPiece = useCallback(
    ({
      piece,
      isSparePiece,
    }: {
      isSparePiece: boolean;
      piece: { pieceType: string };
      square: string | null;
    }) => {
      if (isSparePiece || playMode === "analysis" || isEngineThinking)
        return false;
      const turn = activeFen.split(" ")[1] as "w" | "b";
      const pc = piece.pieceType[0];
      if (playMode === "play-both") return pc === turn;
      if (playMode === "play-white") return turn === "w" && pc === "w";
      if (playMode === "play-black") return turn === "b" && pc === "b";
      return false;
    },
    [playMode, activeFen, isEngineThinking],
  );

  const onPieceDrop = useCallback(
    ({
      sourceSquare,
      targetSquare,
    }: {
      piece: unknown;
      sourceSquare: string;
      targetSquare: string | null;
    }) => {
      if (playMode === "analysis" || !targetSquare) return false;
      clearSelection();
      return handlePlayMove(sourceSquare, targetSquare);
    },
    [playMode, handlePlayMove, clearSelection],
  );

  // ── Move pairs for analysis sidebar ───────────────────────────────────────
  const movePairs = useMemo(() => {
    const pairs: {
      num: number;
      white?: MoveEvaluation;
      black?: MoveEvaluation;
    }[] = [];
    if (!analysisResult) return pairs;
    for (const m of analysisResult.moves) {
      const num = Math.ceil(m.ply / 2);
      if (m.color === "w") pairs.push({ num, white: m });
      else {
        const last = pairs[pairs.length - 1];
        if (last && !last.black) last.black = m;
        else pairs.push({ num, black: m });
      }
    }
    return pairs;
  }, [analysisResult]);

  // ── Accuracy ───────────────────────────────────────────────────────────────
  const playerAccuracy = analysisResult
    ? game.playerColor === "white"
      ? analysisResult.whiteAccuracy
      : analysisResult.blackAccuracy
    : game.playerColor === "white"
      ? (game.analysis?.whiteAccuracy ?? null)
      : (game.analysis?.blackAccuracy ?? null);
  const opponentAccuracy = analysisResult
    ? game.playerColor === "white"
      ? analysisResult.blackAccuracy
      : analysisResult.whiteAccuracy
    : game.playerColor === "white"
      ? (game.analysis?.blackAccuracy ?? null)
      : (game.analysis?.whiteAccuracy ?? null);

  const playerName =
    (game.playerColor === "white" ? game.whitePlayer : game.blackPlayer)
      ?.username ?? "You";
  const opponentName =
    (game.playerColor === "white" ? game.blackPlayer : game.whitePlayer)
      ?.username ?? "Opponent";

  return (
    <div className={styles.root}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <button
          className={styles.backBtn}
          onClick={() => router.push("/history")}
        >
          <ArrowLeft size={13} /> History
        </button>
        <span className={styles.topBarTitle}>
          {game.whitePlayer?.username ?? "White"} vs{" "}
          {game.blackPlayer?.username ?? "Black"}
        </span>
        <span className={styles.topBarMeta}>
          {game.gameName} · {game.timeControl} · {game.moveCount} moves
        </span>
      </div>

      {/* Main layout */}
      <div className={styles.main}>
        {/* Board area */}
        <div className={styles.boardArea}>
          <div className={styles.boardAreaInner}>
            <EvalBar evalWhite={evalWhite} />

            <div className={styles.boardCol}>
              <div className={styles.boardWrap}>
                <Chessboard
                  options={{
                    position: activeFen,
                    boardOrientation,
                    squareStyles,
                    arrows,
                    squareRenderer,
                    allowDrawingArrows: false,
                    allowDragging: playMode !== "analysis" && !isEngineThinking,
                    showAnimations: true,
                    animationDurationInMs: 160,
                    dropSquareStyle: {
                      background: "rgba(20,85,30,0.28)",
                      boxShadow: "inset 0 0 0 3px rgba(129,182,76,0.6)",
                    },
                    draggingPieceStyle: { opacity: 0.75, cursor: "grabbing" },
                    canDragPiece,
                    onPieceDrop,
                    onSquareClick,
                    onPieceDrag: clearSelection,
                    boardStyle: {
                      borderRadius: "5px",
                      boxShadow: "0 6px 32px rgba(0,0,0,0.55)",
                    },
                    darkSquareStyle: { backgroundColor: theme.colors.dark },
                    lightSquareStyle: { backgroundColor: theme.colors.light },
                  }}
                />

                {/* Quality badge (analysis mode) */}
                {currentMoveEval && playMode === "analysis" && (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentPly}
                      className={styles.qualityBadge}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 22,
                      }}
                      style={{
                        ...badgeStyle,
                        background: QUALITY[currentMoveEval.quality].bg,
                        color: QUALITY[currentMoveEval.quality].color,
                        border: `2px solid ${QUALITY[currentMoveEval.quality].color}`,
                      }}
                      title={QUALITY[currentMoveEval.quality].label}
                    >
                      {QUALITY[currentMoveEval.quality].symbol}
                    </motion.div>
                  </AnimatePresence>
                )}

                {/* Promotion picker */}
                <AnimatePresence>
                  {promotionPending && (
                    <PromotionDialog
                      promotingColor={promotingColor}
                      onSelect={onPromotionSelect}
                      onCancel={cancelPromotion}
                    />
                  )}
                </AnimatePresence>
              </div>

              <BoardControls
                playMode={playMode}
                currentPly={currentPly}
                maxPly={maxPly}
                goFirst={goFirst}
                goPrev={goPrev}
                goNext={goNext}
                goLast={goLast}
                goNextUserMove={goNextUserMove}
                flipBoard={flipBoard}
                enterPlayMode={enterPlayMode}
                exitPlayMode={exitPlayMode}
              />
            </div>
          </div>
        </div>

        {/* Side panel */}
        <div className={styles.sidePanel}>
          <AccuracySection
            playerLabel={`${playerName} (${game.playerColor})`}
            playerAccuracy={playerAccuracy}
            opponentLabel={opponentName}
            opponentAccuracy={opponentAccuracy}
          />

          {playMode === "analysis" ? (
            <AnalysisPanel
              alreadyAnalyzed={alreadyAnalyzed}
              isAnalyzing={isAnalyzing}
              analysisResult={analysisResult}
              analysisProgress={analysisProgress}
              currentTopMoves={currentTopMoves}
              currentPly={currentPly}
              movePairs={movePairs}
              startAnalysis={startAnalysis}
              goToMove={goToMove}
              moveListRef={moveListRef}
            />
          ) : (
            <PlayModePanel
              playMode={playMode}
              isEngineThinking={isEngineThinking}
              playTopMoves={playTopMoves}
              playMoves={playMoves}
              playStartFen={playStartFen}
              activeFen={activeFen}
            />
          )}
        </div>
      </div>
    </div>
  );
}
