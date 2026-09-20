"use client";

import React, { useState } from "react";
import { CheckCircle2, ChevronDown } from "lucide-react";
import { BOARD_THEMES, type BoardTheme } from "../../lib/boardThemes";
import type { AppSettings } from "../../hooks/useSettings";
import styles from "./SettingsPage.module.css";

// 8×3 board preview — rows 6,7,8; all 8 columns
// null = empty square
const PREVIEW_LAYOUT: (string | null)[][] = [
  ["♜", null, "♝", "♛", "♚", "♝", null, "♜"], // rank 8 (black pieces)
  ["♟", "♟", "♟", "♟", "♟", "♟", "♟", "♟"], // rank 7 (black pawns)
  [null, null, null, null, null, null, null, null], // rank 6 (empty)
];

const RANK_LABELS = ["8", "7", "6"];
const FILE_LABELS = ["a", "b", "c", "d", "e", "f", "g", "h"];

const PIECE_STYLES = [
  { id: "classic", label: "Classic" },
  { id: "neo", label: "Neo" },
  { id: "alpha", label: "Alpha" },
  { id: "cheq", label: "Cheq" },
];

type BoardTab = "Boards" | "Pieces" | "Background" | "Presets";
const BOARD_TABS: BoardTab[] = ["Boards", "Pieces", "Background", "Presets"];

interface BoardPiecesSettingsProps {
  settings: AppSettings;
  savedThemeId: string;
  onSaveBoardTheme: (id: string) => void;
  onUpdateSetting: <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) => void;
}

export function BoardPiecesSettings({
  settings,
  savedThemeId,
  onSaveBoardTheme,
  onUpdateSetting,
}: BoardPiecesSettingsProps) {
  const [activeTab, setActiveTab] = useState<BoardTab>("Boards");
  const [pendingThemeId, setPendingThemeId] = useState(savedThemeId);
  const [isDirty, setIsDirty] = useState(false);

  const activeTheme: BoardTheme =
    BOARD_THEMES.find((t) => t.id === pendingThemeId) ?? BOARD_THEMES[0]!;

  const handleThemeSelect = (id: string) => {
    setPendingThemeId(id);
    setIsDirty(id !== savedThemeId);
  };

  const handleSave = () => {
    onSaveBoardTheme(pendingThemeId);
    setIsDirty(false);
  };

  const handleCancel = () => {
    setPendingThemeId(savedThemeId);
    setIsDirty(false);
  };

  return (
    <div className={styles.sectionRoot}>
      {/* Tab bar */}
      <div className={styles.tabs}>
        {BOARD_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Boards tab */}
      {activeTab === "Boards" && (
        <>
          <div className={styles.themeSection}>
            {/* 7-column grid of swatches */}
            <div className={styles.themeGrid}>
              {BOARD_THEMES.map((theme) => {
                const isSelected = theme.id === pendingThemeId;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    title={theme.name}
                    aria-label={`Select ${theme.name} board`}
                    aria-pressed={isSelected}
                    className={`${styles.themeDot} ${isSelected ? styles.themeDotActive : ""}`}
                    onClick={() => handleThemeSelect(theme.id)}
                  >
                    {/* 2×2 chess pattern */}
                    <div className={styles.themeGrid2x2}>
                      <div style={{ background: theme.colors.dark }} />
                      <div style={{ background: theme.colors.light }} />
                      <div style={{ background: theme.colors.light }} />
                      <div style={{ background: theme.colors.dark }} />
                    </div>
                    {isSelected && (
                      <div className={styles.themeDotCheck}>
                        <CheckCircle2
                          size={13}
                          color="#81b64c"
                          fill="rgba(0,0,0,0.4)"
                        />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Board preview */}
            <div className={styles.boardPreview}>
              <div className={styles.boardPreviewInner}>
                {PREVIEW_LAYOUT.map((row, rankIdx) => (
                  <div key={rankIdx} className={styles.boardPreviewRow}>
                    {/* Rank label */}
                    <div
                      className={styles.boardPreviewRankLabel}
                      style={{ color: activeTheme.colors.dark }}
                    >
                      {RANK_LABELS[rankIdx]}
                    </div>
                    {/* Squares */}
                    {row.map((piece, fileIdx) => {
                      const isDark = (rankIdx + fileIdx) % 2 !== 0;
                      return (
                        <div
                          key={fileIdx}
                          className={styles.boardPreviewCell}
                          style={{
                            background: isDark
                              ? activeTheme.colors.dark
                              : activeTheme.colors.light,
                          }}
                        >
                          {piece && (
                            <span
                              style={{
                                fontSize: "1.15rem",
                                lineHeight: 1,
                                userSelect: "none",
                                color:
                                  piece === piece.toLowerCase()
                                    ? "#1a1a1a"
                                    : "#ffffff",
                                textShadow:
                                  piece === piece.toLowerCase()
                                    ? "0 1px 2px rgba(255,255,255,0.4)"
                                    : "0 1px 2px rgba(0,0,0,0.5)",
                              }}
                            >
                              {piece}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
                {/* File labels row */}
                <div
                  className={styles.boardPreviewRow}
                  style={{ marginTop: 0 }}
                >
                  <div className={styles.boardPreviewRankLabel} />
                  {FILE_LABELS.map((f) => (
                    <div
                      key={f}
                      className={styles.boardPreviewFileLabel}
                      style={{ color: activeTheme.colors.dark }}
                    >
                      {f}
                    </div>
                  ))}
                </div>
              </div>
              {/* Theme name badge */}
              <div className={styles.themeNameBadge}>{activeTheme.name}</div>
            </div>
          </div>

          {/* Action row */}
          <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.btnCancel}
              onClick={handleCancel}
              disabled={!isDirty}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.btnSave}
              onClick={handleSave}
              disabled={!isDirty}
            >
              Save
            </button>
          </div>

          {/* Board options */}
          <div className={styles.divider} />

          <div className={styles.optionGroup}>
            <ToggleRow
              label="Show coordinates"
              desc="a–h / 1–8 on the board"
              checked={settings.showCoords}
              onChange={(v) => onUpdateSetting("showCoords", v)}
            />
            {settings.showCoords && (
              <div className={styles.radioGroup}>
                <RadioOption
                  name="coordsPos"
                  value="inside"
                  label="Inside"
                  checked={settings.coordsPosition === "inside"}
                  onChange={() => onUpdateSetting("coordsPosition", "inside")}
                />
                <RadioOption
                  name="coordsPos"
                  value="outside"
                  label="Outside"
                  checked={settings.coordsPosition === "outside"}
                  onChange={() => onUpdateSetting("coordsPosition", "outside")}
                />
              </div>
            )}
          </div>

          <div className={styles.optionGroup}>
            <ToggleRow
              label="Highlight Moves"
              desc="Show legal move indicators on the board"
              checked={settings.highlightMoves}
              onChange={(v) => onUpdateSetting("highlightMoves", v)}
            />
          </div>

          <div className={styles.optionGroup}>
            <ToggleRow
              label="Animate Moves"
              desc="Smooth piece movement animations"
              checked={settings.animateMoves}
              onChange={(v) => onUpdateSetting("animateMoves", v)}
            />
          </div>
        </>
      )}

      {/* Pieces tab */}
      {activeTab === "Pieces" && (
        <div className={styles.piecesGrid}>
          {PIECE_STYLES.map((ps) => (
            <button
              key={ps.id}
              type="button"
              className={`${styles.pieceStyleCard} ${settings.pieceStyle === ps.id ? styles.pieceStyleCardActive : ""}`}
              onClick={() =>
                onUpdateSetting(
                  "pieceStyle",
                  ps.id as AppSettings["pieceStyle"],
                )
              }
            >
              <div className={styles.pieceStylePreview}>
                <span style={{ fontSize: "2rem" }}>♔</span>
                <span style={{ fontSize: "2rem" }}>♚</span>
              </div>
              <div className={styles.pieceStyleLabel}>{ps.label}</div>
              {settings.pieceStyle === ps.id && (
                <div className={styles.pieceStyleCheck}>
                  <CheckCircle2 size={14} color="#81b64c" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Background / Presets — placeholder */}
      {(activeTab === "Background" || activeTab === "Presets") && (
        <div className={styles.comingSoon}>
          <span>🎨</span>
          <p>{activeTab} customization coming soon.</p>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────────── */

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className={styles.toggleRow}>
      <div className={styles.toggleMeta}>
        <span className={styles.toggleLabel}>{label}</span>
        {desc && <span className={styles.toggleDesc}>{desc}</span>}
      </div>
      <label className={styles.toggle}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className={styles.toggleSlider} />
      </label>
    </div>
  );
}

function RadioOption({
  name,
  value,
  label,
  checked,
  onChange,
}: {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className={styles.radioLabel}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
      />
      {label}
    </label>
  );
}
