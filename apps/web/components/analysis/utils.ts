import React from "react";
import type { TopMove } from "../../hooks/useAnalysis";

export function squareToBadgeStyle(toSquare: string, orientation: "white" | "black"): React.CSSProperties {
  if (!toSquare || toSquare.length < 2) return { top: 4, right: 4 };
  const file = toSquare.charCodeAt(0) - 97;
  const rank = parseInt(toSquare.charAt(1)) - 1;
  if (isNaN(rank) || file < 0 || file > 7) return { top: 4, right: 4 };
  const col = orientation === "white" ? file : 7 - file;
  const row = orientation === "white" ? 7 - rank : rank;
  return {
    left: `calc(${(col + 1) * 12.5}% - 27px)`,
    top:  `${row * 12.5}%`,
  };
}

export function engineEvalStr(top: TopMove): string {
  if (top.eval.type === "mate") return top.eval.value > 0 ? `M${top.eval.value}` : `-M${Math.abs(top.eval.value)}`;
  const cp = top.eval.value / 100;
  return cp >= 0 ? `+${cp.toFixed(2)}` : `${cp.toFixed(2)}`;
}

export function accuracyColor(acc: number | null): string {
  if (acc === null) return "#6a8a58";
  if (acc >= 90) return "#21d0a7";
  if (acc >= 75) return "#81b64c";
  if (acc >= 60) return "#6db0d6";
  if (acc >= 45) return "#e8c44a";
  return "#e84040";
}
