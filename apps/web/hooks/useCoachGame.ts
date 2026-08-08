"use client";

import { useState, useEffect, useRef, useCallback, CSSProperties } from "react";
import { Chess, type Square } from "chess.js";
import type { CoachOpening } from "@/lib/coachOpenings";
import { pairMoves, formatTime } from "./useChessGame";
import type { MovePair } from "../components/chess/MoveHistoryPanel";
import { useStockfish } from "./useStockfish";

/* ── types ─────────────────────────────────────────────────────────────────── */

export interface CoachGameConfig {
  opening: CoachOpening;
  playerColor: "white" | "black";
  gameMode?: string;
}

export type CoachGameStatus = "playing" | "over";

export interface CoachResult {
  outcome: "win" | "loss" | "draw";
  reason: string;
}

/** A book move the user can play, with from/to squares for board arrows. */
export interface BookHint {
  from: string;
  to: string;
  san: string;
  openingName: string;
}

/** Annotation shown after a move is played. */
export interface MoveAnnotation {
  san: string;
  openingName: string | null;
  isBook: boolean;
  side: "user" | "engine";
}

/* ── constants ──────────────────────────────────────────────────────────────── */

const BOOK_WORKER_URL = "/opening-book-worker.js";
const COACH_BOOK_DEPTH = 30;   // plies to use the opening book
const ENGINE_SKILL     = 20;
const ENGINE_DEPTH     = 16;   // user-specified engine depth
const ANNOTATION_TTL   = 4000; // ms to show the move annotation banner

/* ── hook ───────────────────────────────────────────────────────────────────── */

export function useCoachGame(config: CoachGameConfig | null) {
  /* ── game state ── */
  const gameRef = useRef(new Chess());
  const [fen, setFen] = useState("start");
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [pairs, setPairs] = useState<MovePair[]>([]);
  const [currentMoveIdx, setCurrentMoveIdx] = useState(-1);
  const [status, setStatus] = useState<CoachGameStatus>("playing");
  const [result, setResult] = useState<CoachResult | null>(null);
  const [isEngineThinking, setIsEngineThinking] = useState(false);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [optionSquares, setOptionSquares] = useState<Record<string, CSSProperties>>({});
  const [pgn, setPgn] = useState("");

  /* ── coach-specific state ── */
  const [bookHints, setBookHints] = useState<BookHint[]>([]);
  const [lastMoveAnnotation, setLastMoveAnnotation] = useState<MoveAnnotation | null>(null);
  const annotationTimerRef = useRef<NodeJS.Timeout | null>(null);

  /* ── workers ── */
  // Stockfish hook
  const { ready: sfReady, sendCommand, onOutput } = useStockfish();
  const bookWorkerRef = useRef<Worker | null>(null);
  const bookReadyRef  = useRef(false);
  // Map<requestId, callback> so concurrent book lookups don't collide
  const bookCallbacksRef = useRef(new Map<number, (hints: {move:string; name:string}[]) => void>());
  // Queue for requests that arrive before the book has finished loading
  const pendingBookCallsRef = useRef<Array<{ id: number; fen: string }>>([]);

  const isPlayerWhite = config?.playerColor === "white";

  /* ── annotation helper ──────────────────────────────────────────────────── */
  const showAnnotation = useCallback((ann: MoveAnnotation) => {
    if (annotationTimerRef.current) clearTimeout(annotationTimerRef.current);
    setLastMoveAnnotation(ann);
    annotationTimerRef.current = setTimeout(() => setLastMoveAnnotation(null), ANNOTATION_TTL);
  }, []);

  /* ── book worker (own instance, lives for page lifetime) ────────────────── */
  useEffect(() => {
    const worker = new Worker(BOOK_WORKER_URL);
    bookWorkerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data as {
        type: string; id?: number;
        hints?: { move: string; name: string }[];
        nodeName?: string | null;
        message?: string;
      };

      if (msg.type === "ready") {
        bookReadyRef.current = true;
        // Flush any requests that were queued before the book finished loading
        const queued = pendingBookCallsRef.current.splice(0);
        queued.forEach(({ id, fen }) => {
          worker.postMessage({ type: "hints", id, fen });
        });
        return;
      }
      if (msg.type === "error") {
        console.warn("[coach-book]", msg.message);
        // If the book failed to load, clear the pending queue so callers fall back to Stockfish
        const queued = pendingBookCallsRef.current.splice(0);
        queued.forEach(({ id }) => {
          const cb = bookCallbacksRef.current.get(id);
          if (cb) { bookCallbacksRef.current.delete(id); cb([]); }
        });
        return;
      }
      if (msg.type === "hints" && msg.id != null) {
        const cb = bookCallbacksRef.current.get(msg.id);
        if (cb) { bookCallbacksRef.current.delete(msg.id); cb(msg.hints ?? []); }
      }
    };

    worker.postMessage({ type: "init" });
    return () => {
      worker.terminate();
      bookWorkerRef.current = null;
      bookReadyRef.current = false;
    };
  }, []);


  /* ── reset on config change ──────────────────────────────────────────────── */
  useEffect(() => {
    if (!config) return;
    gameRef.current = new Chess();
    setFen("start");
    setMoveHistory([]);
    setPairs([]);
    setCurrentMoveIdx(-1);
    setStatus("playing");
    setResult(null);
    setIsEngineThinking(false);
    setPendingPromotion(null);
    setSelectedSquare(null);
    setOptionSquares({});
    setPgn("");
    setBookHints([]);
    setLastMoveAnnotation(null);
  }, [config?.opening.id, config?.playerColor]);

  /* ── book query helper ───────────────────────────────────────────────────── */
  const queryBook = useCallback((
    currentFen: string,
    cb: (hints: { move: string; name: string }[]) => void,
  ) => {
    if (!bookWorkerRef.current) { cb([]); return; }
    const id = Date.now() + (Math.random() * 1000 | 0);
    bookCallbacksRef.current.set(id, cb);
    if (!bookReadyRef.current) {
      // Book still loading — queue and replay once it posts "ready"
      pendingBookCallsRef.current.push({ id, fen: currentFen });
      return;
    }
    bookWorkerRef.current.postMessage({ type: "hints", id, fen: currentFen });
  }, []);

  /* ── shared post-move commit ─────────────────────────────────────────────── */
  const commitMove = useCallback(() => {
    const game = gameRef.current;
    const history = game.history();
    setFen(game.fen());
    setMoveHistory(history);
    setPairs(pairMoves(history));
    setCurrentMoveIdx(history.length - 1);
    try { new Audio("/normalMove.mp3").play().catch(() => {}); } catch {}
    if (game.isGameOver()) {
      const outcome = game.isCheckmate()
        ? (game.turn() === (isPlayerWhite ? "w" : "b") ? "loss" : "win")
        : "draw";
      const reason  = game.isCheckmate() ? "by checkmate"
        : game.isStalemate() ? "by stalemate"
        : game.isInsufficientMaterial() ? "insufficient material"
        : "by repetition/50-move rule";
      setPgn(game.pgn());
      setStatus("over");
      setResult({ outcome, reason });
    }
  }, [isPlayerWhite]);

  /* ── apply engine move in UCI format (from Stockfish) ────────────────────── */
  const applyEngineUci = useCallback((uci: string) => {
    const game = gameRef.current;
    try {
      game.move({ from: uci.slice(0,2), to: uci.slice(2,4), promotion: uci[4] || undefined });
    } catch { return; }
    showAnnotation({ san: game.history().at(-1) ?? uci, openingName: null, isBook: false, side: "engine" });
    commitMove();
  }, [commitMove, showAnnotation]);

  /* ── Stockfish options initialization ───────────────────────────────────── */
  useEffect(() => {
    if (!config || !sfReady) return;
    sendCommand("setoption name MultiPV value 1");
    sendCommand("setoption name Hash value 32");
    sendCommand("setoption name Threads value 2");
    if (config.gameMode === "chess960") {
      sendCommand("setoption name UCI_Chess960 value true");
    }
    sendCommand("isready");

    const cleanup = onOutput((line) => {
      if (line.startsWith("bestmove")) {
        const move = line.split(" ")[1];
        if (move && move !== "(none)") applyEngineUci(move);
        setIsEngineThinking(false);
      }
    });
    return cleanup;
  }, [config?.opening.id, config?.playerColor, sfReady, sendCommand, onOutput, applyEngineUci]);

  /* ── apply engine book move in SAN format ────────────────────────────────── */
  const applyEngineSan = useCallback((san: string, openingName: string): boolean => {
    const game = gameRef.current;
    try { game.move(san); } catch { return false; }
    showAnnotation({ san: game.history().at(-1) ?? san, openingName, isBook: true, side: "engine" });
    commitMove();
    return true;
  }, [commitMove, showAnnotation]);

  /* ── fall back to Stockfish ──────────────────────────────────────────────── */
  const askStockfish = useCallback(() => {
    const game = gameRef.current;
    if (!sfReady) return;
    sendCommand(`setoption name Skill Level value ${ENGINE_SKILL}`);
    sendCommand(`position fen ${game.fen()}`);
    sendCommand(`go depth ${ENGINE_DEPTH}`);
  }, [sfReady, sendCommand]);

  /* ── engine move entry point ─────────────────────────────────────────────── */
  const askEngineToMove = useCallback(() => {
    const game = gameRef.current;
    if (game.isGameOver() || status === "over") return;
    setIsEngineThinking(true);
    setBookHints([]);

    const plyCount = game.history().length;

    if (plyCount < COACH_BOOK_DEPTH) {
      queryBook(game.fen(), (hints) => {
        if (hints.length > 0) {
          const chosen = hints[Math.floor(Math.random() * hints.length)]!;
          const ok = applyEngineSan(chosen.move, chosen.name);
          if (ok) { setIsEngineThinking(false); return; }
        }
        askStockfish();
      });
    } else {
      askStockfish();
    }
  }, [status, queryBook, applyEngineSan, askStockfish]);

  /* ── fetch book hints for user's turn ───────────────────────────────────── */
  const fetchBookHints = useCallback((currentFen: string) => {
    queryBook(currentFen, (hints) => {
      const game = gameRef.current;
      const parsed: BookHint[] = hints.flatMap((h) => {
        try {
          const r = game.move(h.move);
          game.undo();
          return [{ from: r.from, to: r.to, san: r.san, openingName: h.name }];
        } catch { return []; }
      });
      setBookHints(parsed);
    });
  }, [queryBook]);

  /* ── trigger engine on its turn ─────────────────────────────────────────── */
  useEffect(() => {
    if (!config || status === "over" || isEngineThinking) return;
    const game = gameRef.current;
    if (game.isGameOver()) return;
    const engineColor = isPlayerWhite ? "b" : "w";
    if (game.turn() === engineColor) {
      const t = setTimeout(() => askEngineToMove(), 350);
      return () => clearTimeout(t);
    }
  }, [fen, config, status, isEngineThinking, isPlayerWhite, askEngineToMove]);

  /* ── fetch hints on user's turn ─────────────────────────────────────────── */
  useEffect(() => {
    if (!config || status === "over") return;
    const game = gameRef.current;
    if (game.isGameOver()) return;
    const playerColor = isPlayerWhite ? "w" : "b";
    if (game.turn() === playerColor) {
      fetchBookHints(game.fen());
    } else {
      setBookHints([]);
    }
  }, [fen, config, status, isPlayerWhite, fetchBookHints]);

  /* ── player move helpers ─────────────────────────────────────────────────── */
  const applyPlayerMove = useCallback((from: string, to: string, promotion?: string): boolean => {
    const game = gameRef.current;
    let moveResult;
    try {
      moveResult = game.move({ from, to, promotion: promotion || "q" });
    } catch { return false; }

    const matchedHint = bookHints.find((h) => h.from === from && h.to === to);
    showAnnotation({
      san: moveResult.san,
      openingName: matchedHint?.openingName ?? null,
      isBook: !!matchedHint,
      side: "user",
    });

    setSelectedSquare(null);
    setOptionSquares({});
    setPendingPromotion(null);
    commitMove();
    return true;
  }, [bookHints, commitMove, showAnnotation]);

  const handleDrop = useCallback(({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare?: string | null }) => {
    if (!targetSquare || status === "over" || isEngineThinking) return false;
    const game = gameRef.current;
    if (game.turn() !== (isPlayerWhite ? "w" : "b")) return false;

    const piece = game.get(sourceSquare as Square);
    if (piece?.type === "p") {
      const rank = targetSquare[1];
      if ((piece.color === "w" && rank === "8") || (piece.color === "b" && rank === "1")) {
        setPendingPromotion({ from: sourceSquare, to: targetSquare });
        return false;
      }
    }
    return applyPlayerMove(sourceSquare, targetSquare);
  }, [status, isEngineThinking, isPlayerWhite, applyPlayerMove]);

  const handlePromotionSelect = useCallback((piece: string) => {
    if (!pendingPromotion) return;
    applyPlayerMove(pendingPromotion.from, pendingPromotion.to, piece);
    setPendingPromotion(null);
  }, [pendingPromotion, applyPlayerMove]);

  const handleSquareClick = useCallback((square: string) => {
    if (status === "over" || isEngineThinking) return;
    const game = gameRef.current;
    const playerColorLetter = isPlayerWhite ? "w" : "b";
    if (game.turn() !== playerColorLetter) return;

    if (selectedSquare) {
      const piece = game.get(selectedSquare as Square);
      if (piece?.type === "p") {
        const rank = square[1];
        if ((piece.color === "w" && rank === "8") || (piece.color === "b" && rank === "1")) {
          setPendingPromotion({ from: selectedSquare, to: square });
          setSelectedSquare(null); setOptionSquares({});
          return;
        }
      }
      const moved = applyPlayerMove(selectedSquare, square);
      if (moved) return;
    }

    const piece = game.get(square as Square);
    if (piece && piece.color === playerColorLetter) {
      setSelectedSquare(square);
      const moves = game.moves({ square: square as Square, verbose: true });
      const sq: Record<string, CSSProperties> = {
        [square]: { background: "rgba(129,182,76,0.35)" },
      };
      moves.forEach((m) => { sq[m.to] = { background: "rgba(129,182,76,0.22)", borderRadius: "50%" }; });
      setOptionSquares(sq);
    } else {
      setSelectedSquare(null); setOptionSquares({});
    }
  }, [status, isEngineThinking, isPlayerWhite, selectedSquare, applyPlayerMove]);

  const handleResign = useCallback(() => {
    if (status === "over") return;
    setPgn(gameRef.current.pgn());
    setStatus("over");
    setResult({ outcome: "loss", reason: "by resignation" });
  }, [status]);

  const handleNewGame = useCallback(() => {
    if (!config) return;
    gameRef.current = new Chess();
    setFen("start");
    setMoveHistory([]); setPairs([]); setCurrentMoveIdx(-1);
    setStatus("playing"); setResult(null);
    setIsEngineThinking(false); setPendingPromotion(null);
    setSelectedSquare(null); setOptionSquares({});
    setPgn(""); setBookHints([]); setLastMoveAnnotation(null);
  }, [config]);

  /* ── move navigation (review) ────────────────────────────────────────────── */
  const reviewFen = currentMoveIdx >= 0
    ? (() => {
        const g = new Chess();
        const hist = gameRef.current.history({ verbose: true });
        for (let i = 0; i <= currentMoveIdx && i < hist.length; i++) g.move(hist[i]!);
        return g.fen();
      })()
    : "start";

  const displayedFen = reviewFen !== "start" ? reviewFen : (fen === "start" ? undefined : fen);

  return {
    game: gameRef.current,
    displayedFen,
    fen,
    moveHistory,
    pairs,
    currentMoveIdx,
    status,
    result,
    isEngineThinking,
    pendingPromotion,
    optionSquares,
    pgn,
    bookHints,
    lastMoveAnnotation,
    handleDrop,
    handleSquareClick,
    handlePromotionSelect,
    handleResign,
    handleNewGame,
    handleFirstMove:  () => setCurrentMoveIdx(0),
    handleLastMove:   () => setCurrentMoveIdx(moveHistory.length - 1),
    handlePrevMove:   () => setCurrentMoveIdx((i) => Math.max(0, i - 1)),
    handleNextMove:   () => setCurrentMoveIdx((i) => Math.min(moveHistory.length - 1, i + 1)),
    handleSelectMove: (idx: number) => setCurrentMoveIdx(idx),
    formatTime,
  };
}
