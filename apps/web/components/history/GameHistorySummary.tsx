import { BarChart3, Clock, ListChecks } from "lucide-react";
import type {
  GameHistoryItem,
  GameHistorySummary as Summary,
} from "../../app/lib/api/games";
import styles from "./GameHistory.module.css";

interface GameHistorySummaryProps {
  summary: Summary;
  games: GameHistoryItem[];
}

function favoriteControl(games: GameHistoryItem[]): string {
  if (games.length === 0) return "No games";

  const counts = new Map<string, number>();
  for (const game of games) {
    const label = `${game.timeControl} ${game.gameName}`;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return (
    [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "No games"
  );
}

export function GameHistorySummary({
  summary,
  games,
}: GameHistorySummaryProps) {
  return (
    <section className={styles.statGrid}>
      <div className={`glass-panel ${styles.statCard}`}>
        <Clock size={22} />
        <span>Favorite control</span>
        <strong>{favoriteControl(games)}</strong>
      </div>
      <div className={`glass-panel ${styles.statCard}`}>
        <BarChart3 size={22} />
        <span>Average accuracy</span>
        <strong>
          {summary.averageAccuracy == null
            ? "Pending"
            : `${summary.averageAccuracy}%`}
        </strong>
      </div>
      <div className={`glass-panel ${styles.statCard}`}>
        <ListChecks size={22} />
        <span>Reviewed games</span>
        <strong>{summary.reviewedGames}</strong>
      </div>
    </section>
  );
}
