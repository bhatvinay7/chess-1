import { accuracyColor } from "./utils";
import styles from "./Analysis.module.css";

function AccuracyCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number | null;
  color: string;
}) {
  return (
    <div className={styles.accuracyCard}>
      <span className={styles.accuracyLabel}>{label}</span>
      <span className={styles.accuracyValue} style={{ color }}>
        {value === null ? "—" : `${value.toFixed(1)}%`}
      </span>
      <div className={styles.accuracyBar}>
        <div
          className={styles.accuracyBarFill}
          style={{ width: `${value ?? 0}%`, background: color }}
        />
      </div>
    </div>
  );
}

interface Props {
  playerLabel: string;
  playerAccuracy: number | null;
  opponentLabel: string;
  opponentAccuracy: number | null;
}

export function AccuracySection({
  playerLabel,
  playerAccuracy,
  opponentLabel,
  opponentAccuracy,
}: Props) {
  return (
    <div className={styles.accuracySection}>
      <AccuracyCard
        label={playerLabel}
        value={playerAccuracy}
        color={accuracyColor(playerAccuracy)}
      />
      <AccuracyCard
        label={opponentLabel}
        value={opponentAccuracy}
        color={accuracyColor(opponentAccuracy)}
      />
    </div>
  );
}
