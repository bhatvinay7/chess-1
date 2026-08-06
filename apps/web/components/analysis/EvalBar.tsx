import styles from "./Analysis.module.css";

export function EvalBar({ evalWhite }: { evalWhite: number }) {
  const clamp    = Math.max(-800, Math.min(800, evalWhite));
  const whitePct = 50 + (clamp / 800) * 50;
  const abs      = Math.abs(evalWhite);
  const display  =
    abs >= 10000 ? "M" :
    abs >= 1000  ? `${(evalWhite / 100).toFixed(0)}` :
                   `${(evalWhite / 100).toFixed(1)}`;

  return (
    <div className={styles.evalBarCol}>
      <div className={styles.evalBarBlack} style={{ height: `${100 - whitePct}%` }} />
      <div className={styles.evalBarFill}  style={{ height: `${whitePct}%` }} />
      {evalWhite >= 0
        ? <span className={`${styles.evalLabel} ${styles.evalLabelTop}`}>{display}</span>
        : <span className={`${styles.evalLabel} ${styles.evalLabelBot}`}>{display.replace("-", "")}</span>
      }
    </div>
  );
}
