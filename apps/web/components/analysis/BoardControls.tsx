import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  FastForward,
  Cpu,
  Swords,
  Users,
  CornerUpLeft,
} from "lucide-react";
import type { PlayMode } from "../../hooks/useAnalysis";
import styles from "./Analysis.module.css";

interface AnalysisControlsProps {
  currentPly: number;
  maxPly: number;
  goFirst: () => void;
  goPrev: () => void;
  goNext: () => void;
  goLast: () => void;
  goNextUserMove: () => void;
  flipBoard: () => void;
  enterPlayMode: (mode: PlayMode) => void;
}

interface PlayControlsProps {
  playMode: PlayMode;
  exitPlayMode: () => void;
}

function AnalysisControls({
  currentPly,
  maxPly,
  goFirst,
  goPrev,
  goNext,
  goLast,
  goNextUserMove,
  flipBoard,
  enterPlayMode,
}: AnalysisControlsProps) {
  return (
    <>
      <button
        className={styles.ctrlBtn}
        onClick={goFirst}
        disabled={currentPly === 0}
        title="First (Home)"
      >
        <ChevronFirst size={15} />
      </button>
      <button
        className={styles.ctrlBtn}
        onClick={goPrev}
        disabled={currentPly === 0}
        title="Prev (←)"
      >
        <ChevronLeft size={15} />
      </button>
      <button
        className={styles.ctrlBtn}
        onClick={goNext}
        disabled={currentPly === maxPly}
        title="Next (→)"
      >
        <ChevronRight size={15} />
      </button>
      <button
        className={styles.ctrlBtn}
        onClick={goLast}
        disabled={currentPly === maxPly}
        title="Last (End)"
      >
        <ChevronLast size={15} />
      </button>
      <button
        className={styles.ctrlBtn}
        onClick={goNextUserMove}
        disabled={currentPly === maxPly}
        title="Your next move"
      >
        <FastForward size={14} />
      </button>
      <div className={styles.ctrlDivider} />
      <button className={styles.ctrlBtn} onClick={flipBoard} title="Flip board">
        <RotateCcw size={14} />
      </button>
      <div className={styles.ctrlDivider} />
      <button
        className={styles.playModeBtn}
        onClick={() => enterPlayMode("play-white")}
        title="Play as White vs engine"
      >
        <Cpu size={12} /> <span>White</span>
      </button>
      <button
        className={styles.playModeBtn}
        onClick={() => enterPlayMode("play-black")}
        title="Play as Black vs engine"
      >
        <Swords size={12} /> <span>Black</span>
      </button>
      <button
        className={styles.playModeBtn}
        onClick={() => enterPlayMode("play-both")}
        title="Play both sides"
      >
        <Users size={12} /> <span>Both</span>
      </button>
    </>
  );
}

function PlayControls({ playMode, exitPlayMode }: PlayControlsProps) {
  return (
    <>
      <button className={styles.backToGameBtn} onClick={exitPlayMode}>
        <CornerUpLeft size={13} /> Back to game position
      </button>
      <span className={styles.playModeLabel}>
        {playMode === "play-white" && "White vs engine"}
        {playMode === "play-black" && "Black vs engine"}
        {playMode === "play-both" && "Both sides"}
      </span>
    </>
  );
}

type Props = AnalysisControlsProps & PlayControlsProps & { playMode: PlayMode };

export function BoardControls({ playMode, ...rest }: Props) {
  return (
    <div className={styles.controls}>
      {playMode === "analysis" ? (
        <AnalysisControls {...rest} enterPlayMode={rest.enterPlayMode} />
      ) : (
        <PlayControls playMode={playMode} exitPlayMode={rest.exitPlayMode} />
      )}
    </div>
  );
}
