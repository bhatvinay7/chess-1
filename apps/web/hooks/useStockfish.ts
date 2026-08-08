"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// Cloudflare R2 storage URLs for long-term caching of Stockfish WASM engine on user devices
const R2_PUBLIC_URL =
  process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL! ||
  process.env.NEXT_PUBLIC_R2_PUBLIC_URL! ||
  "https://thepipe.shop";

const R2_SCRIPT_URL = `${R2_PUBLIC_URL}/stockfish/stockfish-18.js`;
const R2_WASM_URL = `${R2_PUBLIC_URL}/stockfish/stockfish-18.wasm`;
const LOCAL_WORKER_URL = "/stockfish-18.js";
const PROXY_WORKER_URL = "/stockfish-worker.js";

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
    const isRemote =
      process.env.NODE_ENV === "production" ||
      Boolean(process.env.NEXT_PUBLIC_USE_REMOTE_STOCKFISH);

    let worker: Worker;
    if (isRemote) {
      worker = new Worker(PROXY_WORKER_URL);
      worker.postMessage({
        type: "INIT",
        data: {
          scriptUrl: R2_SCRIPT_URL,
          wasmUrl: R2_WASM_URL,
        },
      });
    } else {
      worker = new Worker(LOCAL_WORKER_URL);
    }
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

    if (!isRemote) {
      worker.postMessage("uci");
      worker.postMessage("isready");
    }

    return () => {
      worker.terminate();
      workerRef.current = null;
      setReady(false);
    };
  }, []);

  const sendCommand = useCallback((cmd: string) => {
    if (!workerRef.current) return;
    const isRemote =
      process.env.NODE_ENV === "production" ||
      Boolean(process.env.NEXT_PUBLIC_USE_REMOTE_STOCKFISH!);

    if (isRemote) {
      workerRef.current.postMessage({ type: "COMMAND", data: cmd });
    } else {
      workerRef.current.postMessage(cmd);
    }
  }, []);

  const onOutput = useCallback((handler: StockfishOutputHandler) => {
    handlersRef.current.add(handler);
    return () => { handlersRef.current.delete(handler); };
  }, []);

  return { ready, sendCommand, onOutput };
}
