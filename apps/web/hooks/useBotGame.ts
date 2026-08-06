"use client";

import { useState, useEffect, useRef, useCallback, CSSProperties } from "react";
import { Chess, type Square } from "chess.js";
import type { BotCharacter } from "@/lib/botCharacters";
import { pairMoves, formatTime } from "./useChessGame";
import type { MovePair } from "../components/chess/MoveHistoryPanel";

export interface BotGameConfig {
  bot: BotCharacter;
  playerColor: "white" | "black";
  timeSlot: string; // e.g. "3+2"
  gameMode?: string;
}

export type BotGameStatus = "playing" | "over";

export interface BotGameResult {
  outcome: "win" | "loss" | "draw";
  reason: string;
}

const STOCKFISH_URL = "/stockfish-18.js";
const BOOK_WORKER_URL = "/opening-book-worker.js";

/** Use opening book for the first N half-moves (plies). After this, always use Stockfish. */
const BOOK_DEPTH = 8;

function parseTimeSlot(slot: string): { minutes: number; increment: number } {
  const parts = slot.split("+");
  return {
    minutes: parseInt(parts[0] ?? "5", 10),
    increment: parseInt(parts[1] ?? "0", 10),
  };
}

export function useBotGame(config: BotGameConfig | null) {
  const gameRef = useRef(new Chess());
  const [fen, setFen] = useState("start");
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [pairs, setPairs] = useState<MovePair[]>([]);
  const [currentMoveIdx, setCurrentMoveIdx] = useState(-1);
  const [status, setStatus] = useState<BotGameStatus>("playing");
  const [result, setResult] = useState<BotGameResult | null>(null);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [optionSquares, setOptionSquares] = useState<Record<string, CSSProperties>>({});
  const [pgn, setPgn] = useState("");

  // Timers (seconds)
  const { minutes, increment } = config ? parseTimeSlot(config.timeSlot) : { minutes: 5, increment: 0 };
  const initSecs = minutes * 60;
  const [whiteTime, setWhiteTime] = useState(initSecs);
  const [blackTime, setBlackTime] = useState(initSecs);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTickRef = useRef<number>(performance.now());
  const whiteTimeRef = useRef(initSecs * 1000);
  const blackTimeRef = useRef(initSecs * 1000);
  const tenSoundPlayedRef = useRef({ white: false, black: false });

  // Stockfish worker
  const workerRef = useRef<Worker | null>(null);
  const workerReadyRef = useRef(false);

  // Opening book worker — loaded once, shared across all bot sessions
  const bookWorkerRef = useRef<Worker | null>(null);
  const bookReadyRef = useRef(false);
  // Callback set before each lookup; called when the worker responds
  const bookCallbackRef = useRef<((move: string | null) => void) | null>(null);

  const isPlayerWhite = config?.playerColor === "white";

  // ── Opening book worker init (once on mount) ──────────────────────────────
  useEffect(() => {
    const worker = new Worker(BOOK_WORKER_URL);
    bookWorkerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data as { type: string; id?: number; move?: string | null; size?: number; message?: string };

      if (msg.type === "ready") {
        bookReadyRef.current = true;
        return;
      }

      if (msg.type === "error") {
        // Book failed to load — Stockfish will be used for all moves
        console.warn("[opening-book] failed to load:", msg.message);
        return;
      }

      if (msg.type === "lookup") {
        const cb = bookCallbackRef.current;
        bookCallbackRef.current = null;
        cb?.(msg.move ?? null);
      }
    };

    worker.postMessage({ type: "init" });

    return () => {
      worker.terminate();
      bookWorkerRef.current = null;
      bookReadyRef.current = false;
    };
  }, []); // intentionally empty — one worker instance for the page lifetime

  // ── Reset game state when config changes ──────────────────────────────────
  useEffect(() => {
    if (!config) return;
    const { minutes } = parseTimeSlot(config.timeSlot);
    const initMs = minutes * 60 * 1000;
    gameRef.current = new Chess();
    setFen("start");
    setMoveHistory([]);
    setPairs([]);
    setCurrentMoveIdx(-1);
    setStatus("playing");
    setResult(null);
    setIsBotThinking(false);
    setPendingPromotion(null);
    setSelectedSquare(null);
    setOptionSquares({});
    setPgn("");
    whiteTimeRef.current = initMs;
    blackTimeRef.current = initMs;
    setWhiteTime(minutes * 60);
    setBlackTime(minutes * 60);
    tenSoundPlayedRef.current = { white: false, black: false };
  }, [config?.bot.id, config?.playerColor, config?.timeSlot]);

  // ── Stockfish worker init ─────────────────────────────────────────────────
  useEffect(() => {
    if (!config) return;
    const worker = new Worker(STOCKFISH_URL);
    workerRef.current = worker;
    worker.onmessage = (e: MessageEvent<string>) => {
      const line = typeof e.data === "string" ? e.data : "";
      if (line === "readyok") {
        workerReadyRef.current = true;
        return;
      }
      if (line.startsWith("bestmove")) {
        const parts = line.split(" ");
        const move = parts[1];
        if (move && move !== "(none)") {
          applyBotMove(move);
        }
        setIsBotThinking(false);
      }
    };
    worker.postMessage("uci");
    worker.postMessage("setoption name MultiPV value 1");
    worker.postMessage("setoption name Hash value 32");
    worker.postMessage("setoption name Threads value 2");
    if (config.gameMode === "chess960") {
      worker.postMessage("setoption name UCI_Chess960 value true");
    }
    worker.postMessage("isready");

    return () => {
      worker.terminate();
      workerRef.current = null;
      workerReadyRef.current = false;
    };
  }, [config?.bot.id]);

  // ── Clock ─────────────────────────────────────────────────────────────────
  const stopClock = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startClock = useCallback(() => {
    stopClock();
    if (!config) return;
    lastTickRef.current = performance.now();
    timerRef.current = setInterval(() => {
      const now = performance.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;
      const game = gameRef.current;
      if (game.isGameOver()) { stopClock(); return; }
      const turn = game.turn();
      if (turn === "w") {
        whiteTimeRef.current = Math.max(0, whiteTimeRef.current - delta);
        const secs = Math.ceil(whiteTimeRef.current / 1000);
        setWhiteTime(secs);
        if (secs <= 10 && !tenSoundPlayedRef.current.white) {
          tenSoundPlayedRef.current.white = true;
          new Audio("/tenseconds.mp3").play().catch(() => {});
        }
        if (whiteTimeRef.current <= 0) { stopClock(); finalizeResult(turn); }
      } else {
        blackTimeRef.current = Math.max(0, blackTimeRef.current - delta);
        const secs = Math.ceil(blackTimeRef.current / 1000);
        setBlackTime(secs);
        if (secs <= 10 && !tenSoundPlayedRef.current.black) {
          tenSoundPlayedRef.current.black = true;
          new Audio("/tenseconds.mp3").play().catch(() => {});
        }
        if (blackTimeRef.current <= 0) { stopClock(); finalizeResult(turn); }
      }
    }, 100);
  }, [config, stopClock]);

  const finalizeResult = useCallback((losingTurn: "w" | "b") => {
    const game = gameRef.current;
    let outcome: BotGameResult["outcome"];
    let reason: string;

    if (game.isCheckmate()) {
      const winnerIsWhite = game.turn() === "b";
      outcome = (winnerIsWhite === isPlayerWhite) ? "win" : "loss";
      reason = "by checkmate";
    } else if (game.isDraw() || game.isStalemate() || game.isInsufficientMaterial() || game.isThreefoldRepetition()) {
      outcome = "draw";
      reason = game.isStalemate() ? "by stalemate" : game.isInsufficientMaterial() ? "insufficient material" : game.isThreefoldRepetition() ? "threefold repetition" : "by agreement";
    } else {
      const loserIsWhite = losingTurn === "w";
      outcome = (loserIsWhite !== isPlayerWhite) ? "win" : "loss";
      reason = "on time";
    }

    setPgn(game.pgn());
    setStatus("over");
    setResult({ outcome, reason });
    stopClock();
  }, [isPlayerWhite, stopClock]);

  // ── Shared post-move state update (used by both applyBotMove and applyBotMoveSan) ──
  const commitBotMove = useCallback(() => {
    const game = gameRef.current;
    const botColor = isPlayerWhite ? "b" : "w";
    const inc = config ? parseTimeSlot(config.timeSlot).increment * 1000 : 0;
    if (botColor === "w") {
      whiteTimeRef.current += inc;
      setWhiteTime(Math.ceil(whiteTimeRef.current / 1000));
    } else {
      blackTimeRef.current += inc;
      setBlackTime(Math.ceil(blackTimeRef.current / 1000));
    }

    const newFen = game.fen();
    const history = game.history();
    setFen(newFen);
    setMoveHistory(history);
    setPairs(pairMoves(history));
    setCurrentMoveIdx(history.length - 1);
    setIsBotThinking(false);

    try { new Audio("/normalMove.mp3").play().catch(() => {}); } catch {}

    if (game.isGameOver()) finalizeResult(game.turn());
  }, [config, isPlayerWhite, finalizeResult]);

  // ── Apply a bot move in UCI format (from Stockfish) ───────────────────────
  const applyBotMove = useCallback((moveStr: string) => {
    const game = gameRef.current;
    try {
      const from = moveStr.slice(0, 2);
      const to = moveStr.slice(2, 4);
      const promotion = moveStr[4] || undefined;
      game.move({ from, to, promotion });
    } catch {
      return;
    }
    commitBotMove();
  }, [commitBotMove]);

  // ── Apply a bot move in SAN format (from opening book) ───────────────────
  const applyBotMoveSan = useCallback((san: string): boolean => {
    const game = gameRef.current;
    try {
      game.move(san);
    } catch {
      return false; // invalid SAN — caller should fall back to Stockfish
    }
    commitBotMove();
    return true;
  }, [commitBotMove]);

  // ── Send position to Stockfish ────────────────────────────────────────────
  const askStockfish = useCallback(() => {
    const sf = workerRef.current;
    const game = gameRef.current;
    if (!sf) return;
    const skillLevel = config?.bot.skillLevel ?? 10;
    const depth = config?.bot.depth ?? 10;
    sf.postMessage(`setoption name Skill Level value ${skillLevel}`);
    sf.postMessage(`position fen ${game.fen()}`);
    sf.postMessage(`go depth ${depth}`);
  }, [config]);

  // ── Main bot move entry point ─────────────────────────────────────────────
  const askBotToMove = useCallback(() => {
    const game = gameRef.current;
    if (!workerRef.current || game.isGameOver() || status === "over") return;
    setIsBotThinking(true);

    const plyCount = game.history().length;

    // Opening book: try for the first BOOK_DEPTH half-moves
    if (plyCount < BOOK_DEPTH && bookReadyRef.current && bookWorkerRef.current) {
      bookCallbackRef.current = (san: string | null) => {
        if (san) {
          const applied = applyBotMoveSan(san);
          if (applied) return; // book move played successfully
        }
        // Out of book or invalid move — fall through to Stockfish
        askStockfish();
      };
      bookWorkerRef.current.postMessage({ type: "lookup", id: Date.now(), fen: game.fen() });
    } else {
      // Beyond book depth or book not ready — always use Stockfish
      askStockfish();
    }
  }, [config, status, applyBotMoveSan, askStockfish]);

  // ── Trigger bot move when it's the bot's turn ─────────────────────────────
  useEffect(() => {
    if (!config || status === "over" || isBotThinking) return;
    const game = gameRef.current;
    if (game.isGameOver()) return;
    const botColorLetter = isPlayerWhite ? "b" : "w";
    if (game.turn() === botColorLetter) {
      const delay = setTimeout(() => askBotToMove(), 300);
      return () => clearTimeout(delay);
    }
  }, [fen, config, status, isBotThinking, isPlayerWhite, askBotToMove]);

  // Start clock when game starts
  useEffect(() => {
    if (status === "playing" && config) startClock();
    return () => stopClock();
  }, [status, config]);

  // ── Player moves ──────────────────────────────────────────────────────────
  const handleDrop = useCallback(({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare?: string | null }) => {
    if (!targetSquare || status === "over" || isBotThinking) return false;
    const game = gameRef.current;
    const playerColorLetter = isPlayerWhite ? "w" : "b";
    if (game.turn() !== playerColorLetter) return false;

    const piece = game.get(sourceSquare as Square);
    if (piece?.type === "p") {
      const rank = targetSquare[1];
      if ((piece.color === "w" && rank === "8") || (piece.color === "b" && rank === "1")) {
        setPendingPromotion({ from: sourceSquare, to: targetSquare });
        return false;
      }
    }
    return applyPlayerMove(sourceSquare, targetSquare);
  }, [status, isBotThinking, isPlayerWhite]);

  const applyPlayerMove = useCallback((from: string, to: string, promotion?: string) => {
    const game = gameRef.current;
    try {
      game.move({ from, to, promotion: promotion || "q" });
    } catch {
      return false;
    }

    const playerColor = isPlayerWhite ? "w" : "b";
    const inc = config ? parseTimeSlot(config.timeSlot).increment * 1000 : 0;
    if (playerColor === "w") {
      whiteTimeRef.current += inc;
      setWhiteTime(Math.ceil(whiteTimeRef.current / 1000));
    } else {
      blackTimeRef.current += inc;
      setBlackTime(Math.ceil(blackTimeRef.current / 1000));
    }

    const history = game.history();
    setFen(game.fen());
    setMoveHistory(history);
    setPairs(pairMoves(history));
    setCurrentMoveIdx(history.length - 1);
    setSelectedSquare(null);
    setOptionSquares({});
    setPendingPromotion(null);

    try { new Audio("/normalMove.mp3").play().catch(() => {}); } catch {}

    if (game.isGameOver()) finalizeResult(game.turn());
    return true;
  }, [config, isPlayerWhite, finalizeResult]);

  const handlePromotionSelect = useCallback((piece: string) => {
    if (!pendingPromotion) return;
    applyPlayerMove(pendingPromotion.from, pendingPromotion.to, piece);
    setPendingPromotion(null);
  }, [pendingPromotion, applyPlayerMove]);

  const handleSquareClick = useCallback((square: string) => {
    if (status === "over" || isBotThinking) return;
    const game = gameRef.current;
    const playerColorLetter = isPlayerWhite ? "w" : "b";
    if (game.turn() !== playerColorLetter) return;

    if (selectedSquare) {
      const piece = game.get(selectedSquare as Square);
      if (piece?.type === "p") {
        const rank = square[1];
        if ((piece.color === "w" && rank === "8") || (piece.color === "b" && rank === "1")) {
          setPendingPromotion({ from: selectedSquare, to: square });
          setSelectedSquare(null);
          setOptionSquares({});
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
      const squares: Record<string, CSSProperties> = {
        [square]: { background: "rgba(129,182,76,0.35)" },
      };
      moves.forEach((m) => {
        squares[m.to] = { background: "rgba(129,182,76,0.22)", borderRadius: "50%" };
      });
      setOptionSquares(squares);
    } else {
      setSelectedSquare(null);
      setOptionSquares({});
    }
  }, [status, isBotThinking, isPlayerWhite, selectedSquare, applyPlayerMove]);

  const handleResign = useCallback(() => {
    if (status === "over") return;
    stopClock();
    setPgn(gameRef.current.pgn());
    setStatus("over");
    setResult({ outcome: "loss", reason: "by resignation" });
  }, [status, stopClock]);

  // ── Move navigation (review) ──────────────────────────────────────────────
  const reviewFen = currentMoveIdx >= 0
    ? (() => {
        const g = new Chess();
        const hist = gameRef.current.history({ verbose: true });
        for (let i = 0; i <= currentMoveIdx && i < hist.length; i++) g.move(hist[i]!);
        return g.fen();
      })()
    : "start";

  const displayedFen = reviewFen !== "start" ? reviewFen : (fen === "start" ? undefined : fen);

  const handleFirstMove  = () => setCurrentMoveIdx(0);
  const handleLastMove   = () => setCurrentMoveIdx(moveHistory.length - 1);
  const handlePrevMove   = () => setCurrentMoveIdx((i) => Math.max(0, i - 1));
  const handleNextMove   = () => setCurrentMoveIdx((i) => Math.min(moveHistory.length - 1, i + 1));
  const handleSelectMove = (idx: number) => setCurrentMoveIdx(idx);

  return {
    game: gameRef.current,
    displayedFen,
    fen,
    moveHistory,
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
  };
}
