"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// Keep the worker script same-origin so pthread workers can start normally.
// Stockfish reads the URL fragment as the WASM location; Next.js proxies this
// same-origin path to the public Cloudflare R2 object.
const STOCKFISH_WASM_PATH = "/stockfish/stockfish-18.wasm";
const STOCKFISH_WORKER_URL = `/stockfish-18.js#${encodeURIComponent(STOCKFISH_WASM_PATH)}`;

export type StockfishOutputHandler = (line: string) => void;

export interface UseStockfishReturn {
  ready: boolean;
  sendCommand: (cmd: string) => void;
  onOutput: (handler: StockfishOutputHandler) => () => void;
}

export function useStockfish(): UseStockfishReturn {
  const workerRef = useRef<Worker | null>(null);
  const handlersRef = useRef<Set<StockfishOutputHandler>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const worker = new Worker(STOCKFISH_WORKER_URL);
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<any>) => {
      const msg = e.data;
      if (msg && typeof msg === "object" && "type" in msg) {
        if (msg.type === "READY") {
          worker.postMessage({ type: "COMMAND", data: "uci" });
          worker.postMessage({ type: "COMMAND", data: "isready" });
          return;
        }
        if (msg.type === "OUTPUT") {
          const line = typeof msg.data === "string" ? msg.data : "";
          if (line === "readyok") {
            setReady(true);
            return;
          }
          handlersRef.current.forEach((h) => h(line));
        }
        if (msg.type === "ERROR") {
          console.error("[useStockfish] Worker init error:", msg.data);
        }
        return;
      }

      // Fallback for direct bare string messages (local worker)
      const line = typeof e.data === "string" ? e.data : "";
      if (line === "readyok") {
        setReady(true);
        return;
      }
      handlersRef.current.forEach((h) => h(line));
    };

    worker.onerror = (event) => {
      console.error("[useStockfish] Worker error:", event.message);
    };

    // Stockfish queues commands received while the WASM engine initializes.
    worker.postMessage("uci");
    worker.postMessage("isready");

    return () => {
      worker.terminate();
      workerRef.current = null;
      setReady(false);
    };
  }, []);

  const sendCommand = useCallback((cmd: string) => {
    if (!workerRef.current) return;
    workerRef.current.postMessage(cmd);
  }, []);

  const onOutput = useCallback((handler: StockfishOutputHandler) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  return { ready, sendCommand, onOutput };
}
