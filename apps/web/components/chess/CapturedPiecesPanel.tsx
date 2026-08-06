"use client";

import styles from "./ChessBoard.module.css";

export interface CapturedPiece {
  color: "w" | "b";
  type: string;
}

interface CapturedPiecesPanelProps {
  pieces: CapturedPiece[];
  label: string;
}

const pieceGlyphs: Record<string, Record<"w" | "b", string>> = {
  p: { w: "♙", b: "♟" },
  n: { w: "♘", b: "♞" },
  b: { w: "♗", b: "♝" },
  r: { w: "♖", b: "♜" },
  q: { w: "♕", b: "♛" },
  k: { w: "♔", b: "♚" },
};

const pieceValues: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};
const sortOrder: Record<string, number> = {
  q: 0,
  r: 1,
  b: 2,
  n: 3,
  p: 4,
  k: 5,
};

export function CapturedPiecesPanel({
  pieces,
  label,
}: CapturedPiecesPanelProps) {
  const sortedPieces = [...pieces].sort(
    (a, b) => (sortOrder[a.type] ?? 99) - (sortOrder[b.type] ?? 99),
  );
  const material = sortedPieces.reduce(
    (total, piece) => total + (pieceValues[piece.type] ?? 0),
    0,
  );

  return (
    <section className={styles.capturedPanel} aria-label={label}>
      <div className={styles.capturedHeader}>
        <span>{label}</span>
        {material > 0 && <strong>+{material}</strong>}
      </div>
      <div className={styles.capturedList}>
        {sortedPieces.length === 0 ? (
          <span className={styles.capturedEmpty}>No captures</span>
        ) : (
          sortedPieces.map((piece, index) => (
            <span
              key={`${piece.color}-${piece.type}-${index}`}
              className={styles.capturedPiece}
            >
              {pieceGlyphs[piece.type]?.[piece.color] ?? piece.type}
            </span>
          ))
        )}
      </div>
    </section>
  );
}
