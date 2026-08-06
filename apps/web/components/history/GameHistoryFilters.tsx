import { Circle, Crown, ListFilter, Minus, Swords, Trophy } from "lucide-react";
import type { FilterCounts, HistoryFilter } from "../../app/lib/api/games";
import styles from "./GameHistory.module.css";

export type { HistoryFilter };

interface GameHistoryFiltersProps {
  activeFilter: HistoryFilter;
  filterCounts: FilterCounts;
  onFilterChange: (filter: HistoryFilter) => void;
}

const FILTERS: Array<{ key: HistoryFilter; label: string; icon: typeof ListFilter }> = [
  { key: "all",    label: "All",    icon: ListFilter },
  { key: "wins",   label: "Wins",   icon: Crown      },
  { key: "losses", label: "Losses", icon: Swords     },
  { key: "draws",  label: "Draws",  icon: Minus      },
  { key: "rated",  label: "Rated",  icon: Trophy     },
];

export function GameHistoryFilters({ activeFilter, filterCounts, onFilterChange }: GameHistoryFiltersProps) {
  return (
    <section className={styles.archiveBar} aria-label="Game history filters">
      <div className={styles.archiveTitle}>
        <Circle size={10} fill="currentColor" />
        <span>Archive</span>
      </div>

      <div className={styles.filterTabs}>
        {FILTERS.map(({ key, label, icon: Icon }) => (
          <button
            aria-pressed={activeFilter === key}
            className={activeFilter === key ? styles.filterTabActive : styles.filterTab}
            key={key}
            onClick={() => onFilterChange(key)}
            type="button"
          >
            <Icon size={16} />
            <span>{label}</span>
            <strong>{filterCounts[key]}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}
