import React from "react";
import { CheckCircle2, Loader2, Brain } from "lucide-react";
import type { MoveQuality, MoveEvaluation, TopMove } from "../../hooks/useAnalysis";
import { QUALITY } from "./constants";
import { EngineMovesPanel } from "./EngineMovesPanel";
import styles from "./Analysis.module.css";

function QualityDot({ quality }: { quality: MoveQuality }) {
  const q = QUALITY[quality];
  return (
    <span className={styles.qualityDot} style={{ background: q.bg, color: q.color }} title={q.label}>
      {q.symbol}
    </span>
  );
}

interface Props {
  alreadyAnalyzed: boolean;
  isAnalyzing: boolean;
  analysisResult: { moves: MoveEvaluation[]; whiteAccuracy: number; blackAccuracy: number } | null;
  analysisProgress: { current: number; total: number };
  currentTopMoves: TopMove[];
  currentPly: number;
  movePairs: { num: number; white?: MoveEvaluation; black?: MoveEvaluation }[];
  startAnalysis: () => void;
  goToMove: (ply: number) => void;
  moveListRef: React.RefObject<HTMLDivElement | null>;
}

export function AnalysisPanel({
  alreadyAnalyzed, isAnalyzing, analysisResult, analysisProgress,
  currentTopMoves, currentPly, movePairs, startAnalysis, goToMove, moveListRef,
}: Props) {
  const pct = analysisProgress.total > 0 ? (analysisProgress.current / analysisProgress.total) * 100 : 0;

  return (
    <>
      {alreadyAnalyzed ? (
        <div className={styles.alreadyAnalyzedBadge}>
          <CheckCircle2 size={13} />
          {isAnalyzing
            ? `Refreshing annotations… ${analysisProgress.current}/${analysisProgress.total}`
            : "Already analysed"}
        </div>
      ) : !analysisResult ? (
        <button className={styles.analyzeBtn} onClick={startAnalysis} disabled={isAnalyzing}>
          {isAnalyzing
            ? <><Loader2 size={13} style={{ animation: "spin 0.7s linear infinite" }} /> Analysing… {analysisProgress.current}/{analysisProgress.total}</>
            : <><Brain size={13} /> Analyse Game</>}
        </button>
      ) : null}

      {isAnalyzing && (
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${pct}%` }} />
        </div>
      )}

      {currentTopMoves.length > 0 && <EngineMovesPanel topMoves={currentTopMoves} label="Engine" />}

      <div className={styles.moveListSection} ref={moveListRef}>
        <div className={styles.moveListLabel}>Moves</div>

        {!analysisResult && !isAnalyzing && !alreadyAnalyzed && (
          <div className={styles.loadingState} style={{ flexDirection: "column" }}>
            <Brain size={26} style={{ color: "var(--text-muted)" }} />
            <span>Click &quot;Analyse Game&quot; to review moves</span>
          </div>
        )}

        {isAnalyzing && movePairs.length === 0 && (
          <div className={styles.loadingState}>
            <div className={styles.spinner} /> Analysing positions…
          </div>
        )}

        {movePairs.map(({ num, white, black }) => (
          <div className={styles.moveRow} key={num}>
            <span className={styles.moveNum}>{num}.</span>
            {white ? (
              <div
                data-ply={white.ply}
                className={`${styles.moveCell}${currentPly === white.ply ? ` ${styles.active}` : ""}`}
                onClick={() => goToMove(white.ply)}
              >
                <QualityDot quality={white.quality} />
                <span className={styles.moveSan}>{white.moveSan}</span>
              </div>
            ) : <div className={styles.moveCell} />}
            {black ? (
              <div
                data-ply={black.ply}
                className={`${styles.moveCell}${currentPly === black.ply ? ` ${styles.active}` : ""}`}
                onClick={() => goToMove(black.ply)}
              >
                <QualityDot quality={black.quality} />
                <span className={styles.moveSan}>{black.moveSan}</span>
              </div>
            ) : <div className={styles.moveCell} />}
          </div>
        ))}
      </div>
    </>
  );
}
