import { Cpu } from "lucide-react";
import type { TopMove } from "../../hooks/useAnalysis";
import { engineEvalStr } from "./utils";
import styles from "./Analysis.module.css";

const RANK_COLORS = ["#81b64c", "#6db0d6", "#e8c44a"] as const;

interface Props {
  topMoves: TopMove[];
  label: string;
}

export function EngineMovesPanel({ topMoves, label }: Props) {
  return (
    <div className={styles.engineSection}>
      <div className={styles.sectionLabel}>
        <Cpu size={9} /> {label}
      </div>
      <div className={styles.engineMoves}>
        {topMoves.map((tm) => {
          const rc = RANK_COLORS[(tm.rank - 1) as 0 | 1 | 2] ?? "#e8c44a";
          return (
            <div key={tm.rank} className={styles.engineMove}>
              <span
                className={styles.engineMoveRank}
                style={{ background: `${rc}28`, color: rc }}
              >
                {tm.rank}
              </span>
              <span className={styles.engineMoveSan}>{tm.moveSan}</span>
              <span className={styles.engineMoveEval}>{engineEvalStr(tm)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
