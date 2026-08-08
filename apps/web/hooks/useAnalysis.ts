"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Chess, Position } from "chessops/chess";
import { parseFen, makeFen, INITIAL_FEN } from "chessops/fen";
import { parsePgn } from "chessops/pgn";
import { parseSan, makeSan } from "chessops/san";
import { makeUci, parseUci } from "chessops/util";
import { useStockfish } from "./useStockfish";

// ─── Types ──────────────────────────────────────────────────────────────────

export type MoveQuality =
  | "brilliant"
  | "best"
  | "excellent"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "blunder";

export type PlayMode = "analysis" | "play-white" | "play-black" | "play-both";

export interface EvalScore {
  type: "cp" | "mate";
  value: number;
}

export interface TopMove {
  moveUci: string;
  moveSan: string;
  eval: EvalScore;
  rank: 1 | 2 | 3;
}

export interface PlayMove {
  san: string;
  uci: string;
}

export interface MoveEvaluation {
  ply: number;
  color: "w" | "b";
  moveSan: string;
  moveUci: string;
  fenBefore: string;
  fenAfter: string;
  quality: MoveQuality;
  cpLoss: number;
  isBestMove: boolean;
  evalBefore: EvalScore;
  evalAfterWhite: number;
  topMoves: TopMove[];
  engineBestUci: string;
}

export interface AnalysisResult {
  moves: MoveEvaluation[];
  whiteAccuracy: number;
  blackAccuracy: number;
}

interface GamePosition {
  fen: string;
  moveUci: string;      // UCI of the move played TO REACH this position (empty for pos[0])
  moveSan: string;      // SAN of the same move
  moverColor: "w" | "b"; // who played that move (irrelevant for pos[0])
  colorToMove: "w" | "b"; // side to move IN this position
}

interface PositionEval {
  eval: EvalScore;
  topMoves: TopMove[];
  bestMoveUci: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ANALYSIS_DEPTH       = 15;
const ENGINE_PLAY_DEPTH    = 18;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function evalToWhiteCp(score: EvalScore, colorToMove: "w" | "b"): number {
  const raw = score.type === "cp" ? score.value : score.value > 0 ? 10000 : -10000;
  return colorToMove === "w" ? raw : -raw;
}

function computeCpLoss(evalBefore: EvalScore, evalAfter: EvalScore): number {
  const before = evalBefore.type === "cp" ? evalBefore.value : evalBefore.value > 0 ? 10000 : -10000;
  const after  = evalAfter.type  === "cp" ? evalAfter.value  : evalAfter.value  > 0 ? 10000 : -10000;
  return Math.max(0, Math.min(before - (-after), 2000));
}

function classifyMove(cpLoss: number, isBest: boolean): MoveQuality {
  if (isBest)        return "best";
  if (cpLoss <= 10)  return "excellent";
  if (cpLoss <= 25)  return "good";
  if (cpLoss <= 50)  return "inaccuracy";
  if (cpLoss <= 150) return "mistake";
  return "blunder";
}

function acplToAccuracy(avgCpLoss: number): number {
  return Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * avgCpLoss) - 3.1669));
}

function parseEvalFromLine(line: string): EvalScore | null {
  const mate = line.match(/score mate (-?\d+)/);
  if (mate?.[1]) return { type: "mate", value: parseInt(mate[1]) };
  const cp = line.match(/score cp (-?\d+)/);
  if (cp?.[1]) return { type: "cp", value: parseInt(cp[1]) };
  return null;
}

function extractTopMoves(infoLines: string[], fen: string): TopMove[] {
  const byRank = new Map<number, { eval: EvalScore; moveUci: string }>();
  for (const line of infoLines) {
    const rm = line.match(/multipv (\d)/);
    if (!rm) continue;
    const rank = parseInt(rm[1] ?? "0");
    const ev = parseEvalFromLine(line);
    const moveUci = line.match(/\bpv\s+(\S+)/)?.[1];
    if (ev && moveUci) byRank.set(rank, { eval: ev, moveUci });
  }

  const parsedFen = parseFen(fen).unwrap();
  const pos = Chess.fromSetup(parsedFen).unwrap();
  
  const result: TopMove[] = [];
  for (const [rank, { eval: ev, moveUci }] of byRank) {
    let moveSan = moveUci;
    try {
      const parsedMove = parseUci(moveUci);
      if (parsedMove) {
        moveSan = makeSan(pos, parsedMove);
      }
    } catch { /* illegal */ }
    result.push({ moveUci, moveSan, eval: ev, rank: rank as 1 | 2 | 3 });
  }
  return result.sort((a, b) => a.rank - b.rank);
}

function parsePgnSafe(pgnStr: string): GamePosition[] {
  try {
    const parsed = parsePgn(pgnStr);
    if (parsed.length === 0) return [];
    
    const gameNode = parsed[0]!;
    const setupFen = gameNode.headers.get("FEN") ?? INITIAL_FEN;
    const setup = parseFen(setupFen).unwrap();
    let pos = Chess.fromSetup(setup).unwrap();

    const positions: GamePosition[] = [];
    positions.push({
      fen: makeFen(pos.toSetup()),
      moveUci: "",
      moveSan: "",
      moverColor: "w",
      colorToMove: pos.turn === "white" ? "w" : "b",
    });

    for (const node of gameNode.moves.mainline()) {
      const moverColor = pos.turn === "white" ? "w" : "b";
      const parsedSan = parseSan(pos, node.san);
      if (!parsedSan) break;
      const uci = makeUci(parsedSan);
      const san = makeSan(pos, parsedSan);
      pos.play(parsedSan); // mutates pos
      positions.push({
        fen: makeFen(pos.toSetup()),
        moveUci: uci,
        moveSan: san,
        moverColor: pos.turn === "white" ? "w" : "b",
        colorToMove: pos.turn === "white" ? "w" : "b",
      });
    }
    return positions;
  } catch (e) {
    console.error("PGN parse error", e);
    return [];
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAnalysis({
  pgn,
  playerColor,
  gameMode,
}: {
  pgn: string;
  playerColor: "white" | "black";
  gameMode?: string;
}) {
  // ── Analysis state ────────────────────────────────────────────────────────
  const [positions, setPositions]               = useState<GamePosition[]>([]);
  const [posEvals, setPosEvals]                 = useState<Map<number, PositionEval>>(new Map());
  const [isAnalyzing, setIsAnalyzing]           = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState({ current: 0, total: 0 });
  const [analysisResult, setAnalysisResult]     = useState<AnalysisResult | null>(null);
  const [currentPly, setCurrentPly]             = useState(0);
  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">(playerColor);

  // ── Play state ────────────────────────────────────────────────────────────
  const [playMode, setPlayMode]             = useState<PlayMode>("analysis");
  const [playFen, setPlayFen]               = useState<string | null>(null);
  const [playStartFen, setPlayStartFen]     = useState<string>("");
  const [playMoves, setPlayMoves]           = useState<PlayMove[]>([]);
  const [playTopMoves, setPlayTopMoves]     = useState<TopMove[]>([]);
  const [isEngineThinking, setIsEngineThinking] = useState(false);

  // ── Worker refs ───────────────────────────────────────────────────────────
  const { ready: sfReady, sendCommand, onOutput } = useStockfish();
  const workerReadyRef = useRef(false);
  useEffect(() => { workerReadyRef.current = sfReady; }, [sfReady]);
  const positionsRef = useRef<GamePosition[]>([]);

  // ── Bulk-analysis refs ────────────────────────────────────────────────────
  const queueRef       = useRef<number[]>([]);
  const currentJobRef  = useRef<{ posIdx: number; lines: string[]; done: () => void } | null>(null);
  const runNextJobRef  = useRef<() => void>(() => {});

  // ── Engine-play refs ──────────────────────────────────────────────────────
  const isEngineMovingRef     = useRef(false);
  const engineMoveCbRef       = useRef<((uci: string) => void) | null>(null);
  const engineMoveLinesRef    = useRef<string[]>([]);
  const engineMoveFenRef      = useRef<string>("");
  const doEngineAutoPlayRef   = useRef<(fen: string) => void>(() => {});

  useEffect(() => { positionsRef.current = positions; }, [positions]);

  // ── Parse PGN ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const pos = parsePgnSafe(pgn);
    setPositions(pos);
    positionsRef.current = pos;
    setCurrentPly(0);
    setPosEvals(new Map());
    setAnalysisResult(null);
    setIsAnalyzing(false);
    queueRef.current = [];
    currentJobRef.current = null;
  }, [pgn]);

  // ── Stockfish worker lifecycle ────────────────────────────────────────────
  useEffect(() => {
    const cleanup = onOutput((line) => {
      // Engine auto-play mode: collect all lines, extract top 3 on bestmove
      if (isEngineMovingRef.current) {
        engineMoveLinesRef.current.push(line);
        if (line.startsWith("bestmove")) {
          isEngineMovingRef.current = false;
          setIsEngineThinking(false);
          const uci  = line.split(" ")[1] ?? "";
          const top3 = extractTopMoves(engineMoveLinesRef.current, engineMoveFenRef.current);
          setPlayTopMoves(top3);
          engineMoveLinesRef.current = [];
          const cb = engineMoveCbRef.current;
          engineMoveCbRef.current = null;
          if (uci && uci !== "(none)") cb?.(uci);
        }
        return;
      }

      // Bulk analysis mode
      const job = currentJobRef.current;
      if (job) {
        job.lines.push(line);
        if (line.startsWith("bestmove")) {
          currentJobRef.current = null;
          job.done();
        }
      }
    });
    return cleanup;
  }, [onOutput]);

  // Set UCI_Chess960 whenever gameMode is known / changes.
  useEffect(() => {
    if (!sfReady) return;
    const val = gameMode?.toLowerCase() === "chess960" ? "true" : "false";
    sendCommand(`setoption name UCI_Chess960 value ${val}`);
  }, [gameMode, sfReady, sendCommand]);

  // ── Bulk-analysis: job runner ─────────────────────────────────────────────
  const runNextJob = useCallback(() => {
    if (!workerReadyRef.current) return;
    if (isEngineMovingRef.current) return;
    if (queueRef.current.length === 0) { setIsAnalyzing(false); return; }

    const posIdx = queueRef.current.shift()!;
    const pos    = positionsRef.current[posIdx];
    if (!pos) { runNextJobRef.current(); return; }

    const lines: string[] = [];
    currentJobRef.current = {
      posIdx,
      lines,
      done: () => {
        const bestMoveUci = lines.find((l) => l.startsWith("bestmove"))?.split(" ")[1] ?? "";
        const topMoves    = extractTopMoves(lines, pos.fen);
        const ev = [...lines].reverse().reduce<EvalScore | null>((acc, l) => {
          if (acc) return acc;
          return l.includes("multipv 1") ? parseEvalFromLine(l) : null;
        }, null);

        if (ev) {
          setPosEvals((prev) => {
            const next = new Map(prev);
            next.set(posIdx, { eval: ev, topMoves, bestMoveUci });
            return next;
          });
        }
        setAnalysisProgress((p) => ({ ...p, current: p.current + 1 }));
        runNextJobRef.current();
      },
    };

    sendCommand(`position fen ${pos.fen}`);
    sendCommand(`go depth ${ANALYSIS_DEPTH}`);
  }, [sendCommand]);

  useEffect(() => { runNextJobRef.current = runNextJob; }, [runNextJob]);

  // ── Bulk-analysis: start ───────────────────────────────────────────────────
  const startAnalysis = useCallback(() => {
    if (positions.length === 0) return;

    const doStart = () => {
      sendCommand("setoption name MultiPV value 3");
      sendCommand("ucinewgame");
      queueRef.current = positions.map((_, i) => i);
      setPosEvals(new Map());
      setAnalysisResult(null);
      setIsAnalyzing(true);
      setAnalysisProgress({ current: 0, total: positions.length });
      runNextJobRef.current();
    };

    if (workerReadyRef.current) {
      doStart();
    } else {
      const iv = setInterval(() => {
        if (workerReadyRef.current) { clearInterval(iv); doStart(); }
      }, 100);
    }
  }, [positions]);

  // ── Build AnalysisResult when bulk analysis completes ─────────────────────
  useEffect(() => {
    if (isAnalyzing || posEvals.size < 2 || positions.length < 2) return;

    const moves: MoveEvaluation[] = [];
    let wTotal = 0, wCount = 0, bTotal = 0, bCount = 0;

    for (let i = 1; i < positions.length; i++) {
      const pos = positions[i];
      if (!pos?.moveSan) continue;

      const eb = posEvals.get(i - 1);
      const ea = posEvals.get(i);
      if (!eb || !ea) continue;

      const loss    = computeCpLoss(eb.eval, ea.eval);
      const isBest  = pos.moveUci !== "" && pos.moveUci === eb.bestMoveUci;
      const quality = classifyMove(loss, isBest);

      moves.push({
        ply:           i,
        color:         pos.moverColor,
        moveSan:       pos.moveSan,
        moveUci:       pos.moveUci,
        fenBefore:     positions[i - 1]!.fen,
        fenAfter:      pos.fen,
        quality,
        cpLoss:        loss,
        isBestMove:    isBest,
        evalBefore:    eb.eval,
        evalAfterWhite: evalToWhiteCp(ea.eval, pos.colorToMove),
        topMoves:      eb.topMoves,
        engineBestUci: eb.bestMoveUci,
      });

      if (pos.moverColor === "w") { wTotal += loss; wCount++; }
      else                        { bTotal += loss; bCount++; }
    }

    const whiteAccuracy = Math.round(acplToAccuracy(wCount > 0 ? wTotal / wCount : 0) * 10) / 10;
    const blackAccuracy = Math.round(acplToAccuracy(bCount > 0 ? bTotal / bCount : 0) * 10) / 10;
    setAnalysisResult({ moves, whiteAccuracy, blackAccuracy });
  }, [isAnalyzing, posEvals, positions]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const maxPly = Math.max(0, positions.length - 1);

  const goToMove = useCallback((ply: number) => {
    if (playMode !== "analysis") return;
    setCurrentPly(Math.max(0, Math.min(ply, maxPly)));
  }, [playMode, maxPly]);

  const goFirst = useCallback(() => setCurrentPly(0), []);
  const goLast  = useCallback(() => setCurrentPly(maxPly), [maxPly]);
  const goPrev  = useCallback(() => setCurrentPly((p) => Math.max(0, p - 1)), []);
  const goNext  = useCallback(() => setCurrentPly((p) => Math.min(maxPly, p + 1)), [maxPly]);

  const goNextUserMove = useCallback(() => {
    const uColor = playerColor === "white" ? "w" : "b";
    for (let p = currentPly + 1; p <= maxPly; p++) {
      if (positions[p]?.moverColor === uColor) { setCurrentPly(p); return; }
    }
    setCurrentPly(maxPly);
  }, [currentPly, maxPly, playerColor, positions]);

  const flipBoard = useCallback(
    () => setBoardOrientation((o) => (o === "white" ? "black" : "white")),
    []
  );

  // ── Current board data (analysis mode) ────────────────────────────────────
  const activeFen =
    playMode !== "analysis" && playFen !== null
      ? playFen
      : (positions[currentPly]?.fen ?? INITIAL_FEN);

  const currentEval       = posEvals.get(currentPly)?.eval ?? null;
  const currentTopMoves   = posEvals.get(currentPly)?.topMoves ?? [];
  const currentEngineMove = posEvals.get(currentPly)?.bestMoveUci ?? "";

  const evalWhite = (() => {
    if (!currentEval) return 0;
    const ctm = positions[currentPly]?.colorToMove ?? "w";
    return evalToWhiteCp(currentEval, ctm);
  })();

  // ── Engine auto-play (play mode) ──────────────────────────────────────────
  const doEngineMove = useCallback((fen: string, cb: (uci: string) => void) => {
    if (!workerReadyRef.current) return;
    sendCommand("stop");
    currentJobRef.current = null;
    isEngineMovingRef.current  = true;
    engineMoveCbRef.current    = cb;
    engineMoveLinesRef.current = [];
    engineMoveFenRef.current   = fen;
    setIsEngineThinking(true);
    setPlayTopMoves([]);
    sendCommand("setoption name MultiPV value 3");
    sendCommand(`position fen ${fen}`);
    sendCommand(`go depth ${ENGINE_PLAY_DEPTH}`);
  }, [sendCommand]);

  const doEngineAutoPlay = useCallback((fen: string) => {
    const parsedFen = parseFen(fen).unwrap();
    const chess = Chess.fromSetup(parsedFen).unwrap();
    const isGameOver = chess.isEnd();
    if (isGameOver) return;

    doEngineMove(fen, (uci: string) => {
      try {
        const uciObj = parseUci(uci);
        if (uciObj) {
          const moveSan = makeSan(chess, uciObj);
          chess.play(uciObj);
          setPlayFen(makeFen(chess.toSetup()));
          setPlayMoves((ms) => [...ms, { san: moveSan, uci }]);
        }
      } catch {
        // ignore
      }
    });
  }, [doEngineMove]);

  useEffect(() => { doEngineAutoPlayRef.current = doEngineAutoPlay; }, [doEngineAutoPlay]);

  // ── Play mode lifecycle ───────────────────────────────────────────────────

  const enterPlayMode = useCallback((mode: PlayMode) => {
    const fen = positions[currentPly]?.fen ?? INITIAL_FEN;

    sendCommand("stop");
    currentJobRef.current = null;
    queueRef.current = [];
    setIsAnalyzing(false);

    setPlayFen(fen);
    setPlayStartFen(fen);
    setPlayMoves([]);
    setPlayTopMoves([]);
    setIsEngineThinking(false);
    setPlayMode(mode);
    if (mode === "play-white") setBoardOrientation("white");
    if (mode === "play-black") setBoardOrientation("black");

    if (mode === "play-white" || mode === "play-black") {
      const parsedFen = parseFen(fen).unwrap();
      const chess = Chess.fromSetup(parsedFen).unwrap();
      const engineColor = mode === "play-white" ? "black" : "white";
      const isGameOver = chess.isEnd();
      if (chess.turn === engineColor && !isGameOver) {
        setTimeout(() => doEngineAutoPlayRef.current(fen), 80);
      }
    }
  }, [currentPly, positions]);

  const exitPlayMode = useCallback(() => {
    sendCommand("stop");
    isEngineMovingRef.current = false;
    engineMoveCbRef.current   = null;
    setPlayMode("analysis");
    setPlayFen(null);
    setPlayStartFen("");
    setPlayMoves([]);
    setPlayTopMoves([]);
    setIsEngineThinking(false);
    sendCommand("setoption name MultiPV value 3");
  }, [sendCommand]);

  // ── Handle user piece drop in play mode ────────────────────────────────────
  const handlePlayMove = useCallback((from: string, to: string, promotion?: string): boolean => {
    if (playMode === "analysis") return false;
    const fen = playFen ?? positions[currentPly]?.fen ?? INITIAL_FEN;
    try {
      const parsedFen = parseFen(fen).unwrap();
      const chess = Chess.fromSetup(parsedFen).unwrap();
      
      const uciStr = `${from}${to}${promotion ?? ""}`;
      const uciObj = parseUci(uciStr);
      if (!uciObj) return false;
      
      const moveSan = makeSan(chess, uciObj);
      chess.play(uciObj); // will throw if invalid
      
      const newFen = makeFen(chess.toSetup());
      setPlayFen(newFen);
      setPlayMoves((ms) => [...ms, { san: moveSan, uci: uciStr }]);
      setPlayTopMoves([]); 

      if (playMode === "play-both") return true;

      const engineColor = playMode === "play-white" ? "black" : "white";
      const isGameOver = chess.isEnd();
      if (chess.turn === engineColor && !isGameOver) {
        doEngineAutoPlayRef.current(newFen);
      }
      return true;
    } catch {
      return false;
    }
  }, [playMode, playFen, positions, currentPly]);

  return {
    isAnalyzing,
    analysisProgress,
    analysisResult,
    startAnalysis,
    posEvals,
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
    currentEval,
    evalWhite,
    currentTopMoves,
    currentEngineMove,
    playMode,
    enterPlayMode,
    exitPlayMode,
    handlePlayMove,
    playMoves,
    playStartFen,
    playTopMoves,
    isEngineThinking,
  };
}
