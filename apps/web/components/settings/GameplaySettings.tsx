"use client";

import React from "react";
import type { AppSettings } from "../../hooks/useSettings";
import styles from "./SettingsPage.module.css";

interface GameplaySettingsProps {
  settings: AppSettings;
  onUpdateSetting: <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) => void;
}

export function GameplaySettings({
  settings,
  onUpdateSetting,
}: GameplaySettingsProps) {
  return (
    <div className={styles.sectionRoot}>
      {/* ── Sound & Alerts ── */}
      <div className={styles.optionGroup}>
        <div className={styles.optionGroupTitle}>Sound &amp; Alerts</div>

        <ToggleRow
          label="Move sounds"
          desc="Play audio on each move"
          checked={settings.soundEnabled}
          onChange={(v) => onUpdateSetting("soundEnabled", v)}
        />

        <ToggleRow
          label="Notifications"
          desc="Match-found alerts"
          checked={settings.notifications}
          onChange={(v) => onUpdateSetting("notifications", v)}
        />
      </div>

      <div className={styles.divider} />

      {/* ── Game Controls ── */}
      <div className={styles.optionGroup}>
        <div className={styles.optionGroupTitle}>Game Controls</div>

        <ToggleRow
          label="Auto-promote to Queen"
          desc="Automatically promote pawns to queens without prompting"
          checked={settings.autoPromoteToQueen}
          onChange={(v) => onUpdateSetting("autoPromoteToQueen", v)}
        />

        <ToggleRow
          label="Confirm Resign"
          desc="Show a confirmation dialog before resigning a game"
          checked={settings.confirmResign}
          onChange={(v) => onUpdateSetting("confirmResign", v)}
        />

        <ToggleRow
          label="Show Move List"
          desc="Display the list of played moves during a game"
          checked={settings.showMoveList}
          onChange={(v) => onUpdateSetting("showMoveList", v)}
        />
      </div>

      <div className={styles.divider} />

      {/* ── Board Display ── */}
      <div className={styles.optionGroup}>
        <div className={styles.optionGroupTitle}>Board Display</div>

        <ToggleRow
          label="Animate moves"
          desc="Smooth sliding animations when pieces move"
          checked={settings.animateMoves}
          onChange={(v) => onUpdateSetting("animateMoves", v)}
        />

        <ToggleRow
          label="Highlight moves"
          desc="Highlight legal moves when a piece is selected"
          checked={settings.highlightMoves}
          onChange={(v) => onUpdateSetting("highlightMoves", v)}
        />
      </div>
    </div>
  );
}

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
