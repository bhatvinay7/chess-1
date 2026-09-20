"use client";
import { useRef, useState, useEffect, useMemo } from "react";

// Define a type for your game object instance (e.g., from chess.js)
interface ChessGameInstance {
  turn: () => "w" | "b";
  isGameOver: () => boolean;
}

export function useChessTimer(
  slot: string,
  whitePlayerLeftTime: string,
  blackPlayerLeftTime: string,
  activeGameId: string | null,
  game: ChessGameInstance,
  onTimeout?: () => void,
  /** Unix epoch ms when the tournament game is scheduled to start.
   *  When present and still in the future the clock is frozen (no tick-down). */
  gameStartMs?: number,
) {
  // Keep a stable ref so the interval closure always calls the latest callback.
  const onTimeoutRef = useRef(onTimeout);
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  // 1. Authoritative Refs for millisecond-precision tracking
  const inistialTime =
    typeof window !== "undefined"
      ? localStorage.getItem(activeGameId ?? "")
      : null;
  // Use || "0" instead of ?? "0" to also catch empty strings, preventing NaN
  const time_slot = parseInt((inistialTime ?? slot)?.split("+")?.[0] || "0");
  const whiteTimeRef = useRef<number>(
    (parseInt(whitePlayerLeftTime ?? "0") || time_slot * 60) * 1000,
  );
  const blackTimeRef = useRef<number>(
    (parseInt(blackPlayerLeftTime ?? "0") || time_slot * 60) * 1000,
  );
  const activeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const tenSecondsSoundRef = useRef<HTMLAudioElement | null>(null);
  const tenSecondsPlayedRef = useRef<{ white: boolean; black: boolean }>({
    white: false,
    black: false,
  });
  useEffect(() => {
    tenSecondsSoundRef.current = new Audio("/tenseconds.mp3");
  }, []);

  // 2. State values solely utilized to drive UI rendering
  const [displayWhiteTime, setDisplayWhiteTime] = useState<number>(
    parseInt(whitePlayerLeftTime) || time_slot * 60,
  );
  const [displayBlackTime, setDisplayBlackTime] = useState<number>(
    parseInt(blackPlayerLeftTime) || time_slot * 60,
  );

  // Read increment (seconds) from stored time_slot string e.g. "3+2" → 2s → 2000ms
  const incrementMs = (() => {
    if (typeof window === "undefined" || !activeGameId) return 0;
    const saved = localStorage.getItem(activeGameId);
    return (parseInt(saved?.split("+")?.[1] ?? "0") || 0) * 1000;
  })();

  // Core Loop: Starts or Restarts ticking depending on whose turn it is
  const startClock = () => {
    // Clear any existing ticking interval first to prevent multi-speed clock bugs
    if (activeIntervalRef.current) {
      clearInterval(activeIntervalRef.current);
      activeIntervalRef.current = null;
    }

    // Freeze the clock when the tournament game hasn't started yet.
    if (gameStartMs && Date.now() < gameStartMs) return;

    if (!activeGameId || game.isGameOver()) return;

    let lastTimestamp = performance.now();

    activeIntervalRef.current = setInterval(() => {
      const now = performance.now();
      const deltaTime = now - lastTimestamp;
      lastTimestamp = now;

      const currentTurn = game.turn();

      if (currentTurn === "w") {
        const prevWhite = whiteTimeRef.current;
        whiteTimeRef.current = Math.max(0, prevWhite - deltaTime);
        setDisplayWhiteTime(Math.ceil(whiteTimeRef.current / 1000));
        if (
          Math.ceil(prevWhite / 1000) > 10 &&
          Math.ceil(whiteTimeRef.current / 1000) <= 10 &&
          !tenSecondsPlayedRef.current.white
        ) {
          tenSecondsPlayedRef.current.white = true;
          tenSecondsSoundRef.current?.play().catch(() => {});
        }
        if (whiteTimeRef.current <= 0) {
          handleTimeout("w");
        }
      } else {
        const prevBlack = blackTimeRef.current;
        blackTimeRef.current = Math.max(0, prevBlack - deltaTime);
        setDisplayBlackTime(Math.ceil(blackTimeRef.current / 1000));
        if (
          Math.ceil(prevBlack / 1000) > 10 &&
          Math.ceil(blackTimeRef.current / 1000) <= 10 &&
          !tenSecondsPlayedRef.current.black
        ) {
          tenSecondsPlayedRef.current.black = true;
          tenSecondsSoundRef.current?.play().catch(() => {});
        }
        if (blackTimeRef.current <= 0) {
          handleTimeout("b");
        }
      }
    }, 100); // 100ms precision loop
  };

  // Helper handling when a player runs out of time
  const handleTimeout = (losingColor: "w" | "b") => {
    if (activeIntervalRef.current) {
      clearInterval(activeIntervalRef.current);
      activeIntervalRef.current = null;
    }
    console.log(
      `Game Over: ${losingColor === "w" ? "White" : "Black"} flagged.`,
    );
    onTimeoutRef.current?.();
  };

  // Requirement 2: Increment the active player's time immediately when a move concludes
  const handleMoveCompleted = () => {
    // 1. Pause active clock immediately to halt drift
    if (activeIntervalRef.current) {
      clearInterval(activeIntervalRef.current);
      activeIntervalRef.current = null;
    }

    // 2. Identify who just moved (Note: game.turn() changes *after* the move is submitted)
    // If it is now Black's turn, it means White just completed their move.
    const playerWhoJustMoved = game.turn() === "b" ? "w" : "b";

    if (playerWhoJustMoved === "w") {
      whiteTimeRef.current += incrementMs;
      setDisplayWhiteTime(Math.ceil(whiteTimeRef.current / 1000));
    } else {
      blackTimeRef.current += incrementMs;
      setDisplayBlackTime(Math.ceil(blackTimeRef.current / 1000));
    }

    // 3. Automatically kick off the timer loop for the next player
    startClock();
  };

  // Requirement 3: Override both internal ref counters when authoritative data arrives from outside (e.g., Redis/Sockets)
  const syncTimeFromOutside = (
    serverWhiteTimeMs: number,
    serverBlackTimeMs: number,
  ) => {
    whiteTimeRef.current = serverWhiteTimeMs;
    blackTimeRef.current = serverBlackTimeMs;
    if (serverWhiteTimeMs > 10_000) tenSecondsPlayedRef.current.white = false;
    if (serverBlackTimeMs > 10_000) tenSecondsPlayedRef.current.black = false;

    setDisplayWhiteTime(Math.ceil(serverWhiteTimeMs / 1000));
    setDisplayBlackTime(Math.ceil(serverBlackTimeMs / 1000));

    // If the interval is already running, do NOT restart it — the live loop reads
    // directly from the refs so it will pick up the new values on its next tick
    // (within 100ms). Restarting here would run a stale closure that has the
    // wrong game.turn() and tick the wrong player's clock.
    // Only start the clock if it is not yet running (e.g. first sync on join).
    if (!activeIntervalRef.current) {
      startClock();
    }
  };

  // Requirement 4: Read current live precision millisecond values from refs instantly
  const getCurrentTimes = () => {
    return {
      whiteTimeMs: whiteTimeRef.current,
      blackTimeMs: blackTimeRef.current,
    };
  };

  // Auto-manage game loop cycles when turn changes or structural game states shift
  useEffect(() => {
    startClock();

    return () => {
      if (activeIntervalRef.current) clearInterval(activeIntervalRef.current);
    };
  }, [activeGameId, game]);

  // For tournament games: startClock() was called on mount but returned early
  // because Date.now() < gameStartMs.  Schedule a one-shot re-call so the clock
  // begins ticking the moment the game window opens, without waiting for a move.
  useEffect(() => {
    if (!gameStartMs) return;
    const remaining = gameStartMs - Date.now();
    if (remaining <= 0) {
      startClock();
      return;
    }
    const id = setTimeout(() => startClock(), remaining);
    return () => clearTimeout(id);
  }, [gameStartMs]);
  return useMemo(
    () => ({
      displayWhiteTime,
      displayBlackTime,
      startClock,
      handleMoveCompleted,
      syncTimeFromOutside,
      getCurrentTimes,
    }),
    [displayWhiteTime, displayBlackTime],
  );
}
