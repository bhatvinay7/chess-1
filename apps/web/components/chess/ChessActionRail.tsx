"use client";

import {
  Bug,
  MessageSquare,
  Plus,
  RefreshCcw,
  RotateCcw,
  Settings,
  Share2,
} from "lucide-react";
import styles from "./ChessBoard.module.css";

interface ChessActionRailProps {
  onNewGame: () => void;
  onRematch: () => void;
}

const actions = [
  { label: "New game", icon: Plus, key: "new-game" },
  { label: "Settings", icon: Settings, key: "settings" },
  { label: "Flip board", icon: RotateCcw, key: "flip-board" },
  { label: "Share game", icon: Share2, key: "share-game" },
  { label: "Report a bug", icon: Bug, key: "report-bug" },
  { label: "Chat soon", icon: MessageSquare, key: "chat" },
] as const;

export function ChessActionRail({
  onNewGame,
  onRematch,
}: ChessActionRailProps) {
  return (
    <aside className={styles.actionRail} aria-label="Game actions">
      <div className={styles.actionGrid}>
        {actions.map(({ label, icon: Icon, key }) => (
          <button
            key={key}
            className={styles.railAction}
            type="button"
            onClick={key === "new-game" ? onNewGame : undefined}
            title={label}
          >
            <Icon size={25} strokeWidth={1.7} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <button
        className={styles.rematchButton}
        type="button"
        onClick={onRematch}
      >
        <RefreshCcw size={16} />
        Rematch
      </button>
    </aside>
  );
}
