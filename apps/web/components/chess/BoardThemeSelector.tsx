"use client";

import React from "react";
import { BOARD_THEMES } from "../../lib/boardThemes";
import styles from "./ChessBoard.module.css";

interface BoardThemeSelectorProps {
  savedThemeId: string;
  onSave: (id: string) => void;
}

export function BoardThemeSelector({
  savedThemeId,
  onSave,
}: BoardThemeSelectorProps) {
  return (
    <div className={styles.boardThemeStrip} aria-label="Board theme" style={{ top: '10px', right: '10px' }}>
      {BOARD_THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          title={t.name}
          aria-label={`Switch to ${t.name}`}
          className={`${styles.boardThemeDot} ${
            t.id === savedThemeId ? styles.boardThemeDotActive : ""
          }`}
          onClick={() => onSave(t.id)}
        >
          {/* 2×2 chess pattern */}
          <div className={styles.boardThemeDotGrid}>
            <div style={{ background: t.colors.dark }} />
            <div style={{ background: t.colors.light }} />
            <div style={{ background: t.colors.light }} />
            <div style={{ background: t.colors.dark }} />
          </div>
        </button>
      ))}
    </div>
  );
}
