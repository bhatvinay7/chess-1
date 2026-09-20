"use client";

import { SlidersHorizontal } from "lucide-react";
import type {
  TournamentFilters,
  TournamentStatus,
  TournamentType,
  TournamentAccessType,
} from "./types";
import styles from "./TournamentFilter.module.css";

interface Props {
  filters: TournamentFilters;
  onChange: (f: TournamentFilters) => void;
}

const STATUSES: { value: TournamentStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All events" },
  { value: "REGISTRATION_OPEN", label: "Open to join" },
  { value: "IN_PROGRESS", label: "Live now" },
  { value: "NOT_INITIALIZED", label: "Upcoming" },
  { value: "COMPLETED", label: "Completed" },
];

const ACCESS_TYPES: { value: TournamentAccessType | "ALL"; label: string }[] = [
  { value: "ALL", label: "All access" },
  { value: "OPEN", label: "Open" },
  { value: "CLUB", label: "Club" },
  { value: "CROSS_CLUB", label: "Cross-Club" },
  { value: "PRIVATE", label: "Private" },
];

const TYPES: { value: TournamentType | "ALL"; label: string; color: string }[] =
  [
    { value: "ALL", label: "All formats", color: "#f28b38" },
    { value: "ARENA", label: "Arena", color: "#e85d5d" },
    { value: "CLUB_SWISS", label: "Club Swiss", color: "#4b9de8" },
    { value: "GLOBAL_SWISS", label: "Global Swiss", color: "#9b6fe8" },
    { value: "CLUB_ROUND_ROBIN", label: "Round Robin", color: "#3ecf8e" },
    { value: "GLOBAL_ROUND_ROBIN", label: "Global R.R.", color: "#06b6d4" },
    { value: "DAILY", label: "Daily", color: "#f59e0b" },
  ];

export default function TournamentFilter({ filters, onChange }: Props) {
  const statusVal = filters.status ?? "ALL";
  const typeVal = filters.type ?? "ALL";
  const accessVal = filters.accessType ?? "ALL";

  return (
    <aside className={styles.panel}>
      <div className={styles.panelHeader}>
        <SlidersHorizontal size={14} />
        <span>Filters</span>
      </div>

      {/* Status */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Status</div>
        <div className={styles.optionList}>
          {STATUSES.map((s) => (
            <label key={s.value} className={styles.option}>
              <input
                type="radio"
                name="status"
                className={styles.radio}
                checked={statusVal === s.value}
                onChange={() => onChange({ ...filters, status: s.value })}
              />
              <span className={styles.optionLabel}>{s.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className={styles.divider} />

      {/* Format */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Format</div>
        <div className={styles.optionList}>
          {TYPES.map((t) => (
            <label key={t.value} className={styles.option}>
              <input
                type="radio"
                name="type"
                className={styles.radio}
                checked={typeVal === t.value}
                onChange={() =>
                  onChange({
                    ...filters,
                    type: t.value as TournamentType | "ALL",
                  })
                }
              />
              <span
                className={styles.typeDot}
                style={{ background: t.color }}
              />
              <span className={styles.optionLabel}>{t.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className={styles.divider} />

      {/* Access */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Access</div>
        <div className={styles.optionList}>
          {ACCESS_TYPES.map((a) => (
            <label key={a.value} className={styles.option}>
              <input
                type="radio"
                name="access"
                className={styles.radio}
                checked={accessVal === a.value}
                onChange={() =>
                  onChange({
                    ...filters,
                    accessType: a.value as TournamentAccessType | "ALL",
                  })
                }
              />
              <span className={styles.optionLabel}>{a.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className={styles.divider} />

      <button
        type="button"
        className={styles.resetBtn}
        onClick={() =>
          onChange({ status: "ALL", type: "ALL", accessType: "ALL" })
        }
      >
        Reset filters
      </button>
    </aside>
  );
}
