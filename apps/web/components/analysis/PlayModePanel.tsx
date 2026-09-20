import { useMemo } from "react";
import { Chess } from "chess.js";
import { Loader2, Trophy } from "lucide-react";
import type { TopMove, PlayMode, PlayMove } from "../../hooks/useAnalysis";
import { EngineMovesPanel } from "./EngineMovesPanel";
import styles from "./Analysis.module.css";

interface Props {
  playMode: PlayMode;
  isEngineThinking: boolean;
  playTopMoves: TopMove[];
  playMoves: PlayMove[];
  playStartFen: string;
  activeFen: string;
}

export function PlayModePanel({
  playMode,
  isEngineThinking,
  playTopMoves,
  playMoves,
  playStartFen,
  activeFen,
}: Props) {
  const isVsEngine = playMode === "play-white" || playMode === "play-black";

  const gameStatus = useMemo(() => {
    if (!activeFen) return null;
    const c = new Chess(activeFen);
    if (c.isCheckmate()) return "Checkmate!";
    if (c.isStalemate()) return "Stalemate";
    if (c.isDraw()) return "Draw";
    return null;
  }, [activeFen]);

  const historyRows = useMemo(() => {
    if (!playStartFen || playMoves.length === 0) return [];
    const sc = new Chess(playStartFen);
    const rows: { num: number; white?: string; black?: string }[] = [];
    let turn = sc.turn() as "w" | "b";
    let moveNum = sc.moveNumber();

    for (const m of playMoves) {
      if (turn === "w") {
        rows.push({ num: moveNum, white: m.san });
        turn = "b";
      } else {
        const last = rows[rows.length - 1];
        if (last && last.black === undefined) last.black = m.san;
        else rows.push({ num: moveNum, black: m.san });
        moveNum++;
        turn = "w";
      }
    }
    return rows;
  }, [playMoves, playStartFen]);

  return (
    <>
      {isVsEngine && (
        <div className={styles.engineSection}>
          <div className={styles.sectionLabel}>
            {isEngineThinking ? "Engine thinking…" : "Engine top moves"}
          </div>
          {isEngineThinking ? (
            <div className={styles.engineThinking}>
              <Loader2 size={14} className={styles.spinIcon} />
              <span>Calculating…</span>
            </div>
          ) : playTopMoves.length > 0 ? (
            <EngineMovesPanel topMoves={playTopMoves} label="" />
          ) : (
            <div className={styles.enginePlaceholder}>
              <span>Make a move to see engine response</span>
            </div>
          )}
        </div>
      )}

      {gameStatus && (
        <div className={styles.gameOverBanner}>
          <Trophy size={13} /> {gameStatus}
        </div>
      )}

      <div className={styles.moveListSection}>
        <div className={styles.moveListLabel}>Moves played</div>
        {historyRows.length === 0 ? (
          <div className={styles.loadingState}>
            <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
              {playMode === "play-both"
                ? "Play moves to see history"
                : "Waiting for first move…"}
            </span>
          </div>
        ) : (
          historyRows.map(({ num, white, black }) => (
            <div className={styles.moveRow} key={num}>
              <span className={styles.moveNum}>{num}.</span>
              <div className={styles.moveCell}>
                {white && <span className={styles.moveSan}>{white}</span>}
              </div>
              <div className={styles.moveCell}>
                {black && <span className={styles.moveSan}>{black}</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
