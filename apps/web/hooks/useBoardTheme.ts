"use client";

import { useState, useEffect } from "react";
import { BOARD_THEMES, DEFAULT_THEME_ID, type BoardTheme } from "../lib/boardThemes";

const STORAGE_KEY = "chess-board-theme";

export function useBoardTheme(): {
  theme: BoardTheme;
  savedThemeId: string;
  saveTheme: (id: string) => void;
} {
  const [savedThemeId, setSavedThemeId] = useState<string>(DEFAULT_THEME_ID);

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    const stored = typeof window !== "undefined"
      ? localStorage.getItem(STORAGE_KEY)
      : null;
    if (stored && BOARD_THEMES.some((t) => t.id === stored)) {
      setSavedThemeId(stored);
    }
  }, []);

  const theme =
    BOARD_THEMES.find((t) => t.id === savedThemeId) ?? BOARD_THEMES[0]!;

  function saveTheme(id: string): void {
    setSavedThemeId(id);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, id);
    }
  }

  return { theme, savedThemeId, saveTheme };
}
