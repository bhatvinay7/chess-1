"use client";

import {
  LayoutGrid,
  Swords,
  Users,
  Globe,
  RefreshCw,
  CalendarDays,
  Globe2,
  Plus,
} from "lucide-react";
import type { TournamentType } from "./types";
import styles from "./TournamentTypesSidebar.module.css";

export type TypeFilter = TournamentType | "ALL";

interface TypeConfig {
  id: TypeFilter;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  color: string;
  symbol: string;
}

export const TOURNAMENT_TYPE_CONFIGS: TypeConfig[] = [
  {
    id: "ALL",
    label: "All",
    sublabel: "Every format",
    icon: <LayoutGrid size={18} />,
    color: "#f28b38",
    symbol: "♛",
  },
  {
    id: "ARENA",
    label: "Arena",
    sublabel: "Timed battle",
    icon: <Swords size={18} />,
    color: "#e85d5d",
    symbol: "⚔",
  },
  {
    id: "CLUB_SWISS",
    label: "Swiss",
    sublabel: "Club rounds",
    icon: <Users size={18} />,
    color: "#4b9de8",
    symbol: "♖",
  },
  {
    id: "GLOBAL_SWISS",
    label: "Global Swiss",
    sublabel: "Open system",
    icon: <Globe size={18} />,
    color: "#9b6fe8",
    symbol: "♜",
  },
  {
    id: "CLUB_ROUND_ROBIN",
    label: "Round Robin",
    sublabel: "Club league",
    icon: <RefreshCw size={18} />,
    color: "#3ecf8e",
    symbol: "♞",
  },
  {
    id: "GLOBAL_ROUND_ROBIN",
    label: "Global R.R.",
    sublabel: "World league",
    icon: <Globe2 size={18} />,
    color: "#06b6d4",
    symbol: "♝",
  },
  {
    id: "DAILY",
    label: "Daily",
    sublabel: "Correspondence",
    icon: <CalendarDays size={18} />,
    color: "#f59e0b",
    symbol: "♟",
  },
];

interface Props {
  selected: TypeFilter;
  onSelect: (t: TypeFilter) => void;
  onCreateClick: () => void;
}

export default function TournamentTypesSidebar({ selected, onSelect, onCreateClick }: Props) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.label}>Formats</div>

      <nav className={styles.typeList}>
        {TOURNAMENT_TYPE_CONFIGS.map((t) => {
          const active = selected === t.id;
          return (
            <button
              key={t.id}
              type="button"
              className={`${styles.typeItem} ${active ? styles.typeItemActive : ""}`}
              onClick={() => onSelect(t.id)}
              style={active ? ({ "--type-color": t.color } as React.CSSProperties) : undefined}
            >
              <span
                className={styles.typeIcon}
                style={{ color: active ? t.color : undefined }}
              >
                {t.icon}
              </span>
              <span className={styles.typeMeta}>
                <span className={styles.typeLabel}>{t.label}</span>
                <span className={styles.typeSub}>{t.sublabel}</span>
              </span>
              {active && (
                <span
                  className={styles.typeSymbol}
                  style={{ color: t.color }}
                >
                  {t.symbol}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className={styles.divider} />

      <button type="button" className={styles.createBtn} onClick={onCreateClick}>
        <Plus size={15} />
        <span>New Tournament</span>
      </button>
    </aside>
  );
}
