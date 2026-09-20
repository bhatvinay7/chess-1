import type { MoveQuality } from "../../hooks/useAnalysis";

export const QUALITY: Record<
  MoveQuality,
  { label: string; color: string; bg: string; symbol: string }
> = {
  brilliant: {
    label: "Brilliant",
    color: "#21d0a7",
    bg: "rgba(33,208,167,0.18)",
    symbol: "!!",
  },
  best: {
    label: "Best",
    color: "#81b64c",
    bg: "rgba(129,182,76,0.18)",
    symbol: "✓",
  },
  excellent: {
    label: "Excellent",
    color: "#6cb36a",
    bg: "rgba(108,179,106,0.18)",
    symbol: "!",
  },
  good: {
    label: "Good",
    color: "#6db0d6",
    bg: "rgba(109,176,214,0.18)",
    symbol: "·",
  },
  inaccuracy: {
    label: "Inaccuracy",
    color: "#e8c44a",
    bg: "rgba(232,196,74,0.18)",
    symbol: "?!",
  },
  mistake: {
    label: "Mistake",
    color: "#e89540",
    bg: "rgba(232,149,64,0.18)",
    symbol: "?",
  },
  blunder: {
    label: "Blunder",
    color: "#e84040",
    bg: "rgba(232,64,64,0.18)",
    symbol: "??",
  },
};
