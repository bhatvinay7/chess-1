"use client";

import { useState, useEffect, useCallback } from "react";

export type CoordsPosition = "inside" | "outside";
export type PieceStyle = "classic" | "neo" | "alpha" | "cheq";

export interface AppSettings {
  showCoords: boolean;
  coordsPosition: CoordsPosition;
  highlightMoves: boolean;
  animateMoves: boolean;
  soundEnabled: boolean;
  notifications: boolean;
  pieceStyle: PieceStyle;
  autoPromoteToQueen: boolean;
  showMoveList: boolean;
  confirmResign: boolean;
}

const STORAGE_KEY = "rooky-settings";

const DEFAULT_SETTINGS: AppSettings = {
  showCoords: true,
  coordsPosition: "outside",
  highlightMoves: true,
  animateMoves: true,
  soundEnabled: true,
  notifications: false,
  pieceStyle: "classic",
  autoPromoteToQueen: false,
  showMoveList: true,
  confirmResign: true,
};

function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } as AppSettings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function persistSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage errors
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage after mount to avoid SSR mismatch
  useEffect(() => {
    setSettings(loadSettings());
    setHydrated(true);
  }, []);

  const updateSetting = useCallback(
    <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value };
        persistSettings(next);
        return next;
      });
    },
    [],
  );

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    persistSettings(DEFAULT_SETTINGS);
  }, []);

  return {
    settings,
    hydrated,
    updateSetting,
    resetSettings,
    // Convenience destructured accessors
    showCoords: settings.showCoords,
    coordsPosition: settings.coordsPosition,
    highlightMoves: settings.highlightMoves,
    animateMoves: settings.animateMoves,
    soundEnabled: settings.soundEnabled,
    notifications: settings.notifications,
    pieceStyle: settings.pieceStyle,
    autoPromoteToQueen: settings.autoPromoteToQueen,
    showMoveList: settings.showMoveList,
    confirmResign: settings.confirmResign,
  };
}
