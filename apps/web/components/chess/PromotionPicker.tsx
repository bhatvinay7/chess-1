"use client";

import { defaultPieces } from "react-chessboard";

interface PromotionPickerProps {
  color: "w" | "b";
  targetSquare: string;
  isWhiteBoard: boolean;
  onSelect: (piece: string) => void;
  onCancel: () => void;
}

const PROMOTION_PIECES = [
  { key: "q", label: "Queen" },
  { key: "r", label: "Rook" },
  { key: "b", label: "Bishop" },
  { key: "n", label: "Knight" },
];

export function PromotionPicker({
  color,
  targetSquare,
  isWhiteBoard,
  onSelect,
  onCancel,
}: PromotionPickerProps) {
  const fileIndex = targetSquare.charCodeAt(0) - "a".charCodeAt(0); // 0-7
  const boardColIndex = isWhiteBoard ? fileIndex : 7 - fileIndex;
  const leftPercent = boardColIndex * 12.5;

  // White promoting → rank 8; on white board that's the top row.
  // Black promoting → rank 1; on black board that's also the top row.
  const stackFromTop = color === "w" ? isWhiteBoard : !isWhiteBoard;

  return (
    <>
      {/* Semi-transparent backdrop — click to cancel */}
      <div
        onClick={onCancel}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
          zIndex: 10,
          cursor: "default",
        }}
      />

      {/* 4-piece strip at the promoting file */}
      <div
        style={{
          position: "absolute",
          left: `${leftPercent}%`,
          [stackFromTop ? "top" : "bottom"]: 0,
          width: "12.5%",
          display: "flex",
          flexDirection: stackFromTop ? "column" : "column-reverse",
          zIndex: 11,
          boxShadow: "0 6px 24px rgba(0,0,0,0.55)",
          borderRadius: "4px",
          overflow: "hidden",
        }}
      >
        {PROMOTION_PIECES.map(({ key, label }, i) => {
          const code =
            `${color}${key.toUpperCase()}` as keyof typeof defaultPieces;
          const PieceComponent = defaultPieces[code];
          const bg = i % 2 === 0 ? "#f0d9b5" : "#b58863";

          return (
            <button
              key={key}
              type="button"
              title={label}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(key);
              }}
              style={{
                width: "100%",
                aspectRatio: "1",
                background: bg,
                border: "none",
                cursor: "pointer",
                padding: "7%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "filter 0.1s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.filter =
                  "brightness(1.18)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.filter = "";
              }}
            >
              {PieceComponent ? (
                <PieceComponent svgStyle={{ width: "100%", height: "100%" }} />
              ) : (
                <span style={{ fontWeight: 700, fontSize: "1.1em" }}>
                  {key.toUpperCase()}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}
