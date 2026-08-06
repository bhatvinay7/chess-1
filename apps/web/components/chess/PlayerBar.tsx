"use client";

import React from "react";
import styles from "./ChessBoard.module.css";
import type { CapturedPiece } from "./CapturedPiecesPanel";

const PIECE_GLYPHS: Record<string, Record<"w" | "b", string>> = {
  p: { w: "♙", b: "♟" },
  n: { w: "♘", b: "♞" },
  b: { w: "♗", b: "♝" },
  r: { w: "♖", b: "♜" },
  q: { w: "♕", b: "♛" },
  k: { w: "♔", b: "♚" },
};

const PIECE_VALUES: Record<string, number> = {
  p: 1, n: 3, b: 3, r: 5, q: 9, k: 0,
};
const SORT_ORDER: Record<string, number> = {
  q: 0, r: 1, b: 2, n: 3, p: 4, k: 5,
};

function sortCaptured(pieces: CapturedPiece[]): CapturedPiece[] {
  return [...pieces].sort(
    (a, b) => (SORT_ORDER[a.type] ?? 99) - (SORT_ORDER[b.type] ?? 99),
  );
}

function materialAdvantage(pieces: CapturedPiece[]): number {
  return pieces.reduce((sum, p) => sum + (PIECE_VALUES[p.type] ?? 0), 0);
}

export function CapturedInline({ pieces }: { pieces: CapturedPiece[] }) {
  const sorted = sortCaptured(pieces);
  const adv = materialAdvantage(sorted);
  if (sorted.length === 0) return null;
  return (
    <div className={styles.capturedInline}>
      {sorted.map((p, i) => (
        <span key={i} className={styles.capturedPieceInline}>
          {PIECE_GLYPHS[p.type]?.[p.color as "w" | "b"] ?? ""}
        </span>
      ))}
      {adv > 0 && <span className={styles.capturedMaterial}>+{adv}</span>}
    </div>
  );
}

const DEFAULT_AVATAR = "/defaultUser.jpg";

export function PlayerAvatar({
  name,
  profileImageUrl,
  isYou,
}: {
  name: string;
  profileImageUrl: string;
  isYou?: boolean;
}) {
  const src = profileImageUrl || DEFAULT_AVATAR;
  return (
    <div className={`${styles.avatar} ${isYou ? styles.avatarYou : ""}`}>
      <img
        src={src}
        alt={name}
        style={{ width: "100%", height: "100%", borderRadius: "95%", objectFit: "cover" }}
        crossOrigin="anonymous"
      />
    </div>
  );
}

interface PlayerBarProps {
  name: string;
  /** Pass undefined/null to show "—"; pass a number/string to show the value */
  rating?: number | string | null;
  profileImageUrl: string;
  /** Pre-formatted clock string, e.g. "03:00" */
  clock: string;
  /** Actual captured pieces for game mode; omit for lobby mode */
  capturedPieces?: CapturedPiece[];
  isYou?: boolean;
  /** Highlights the clock when it's this player's turn */
  isActiveTurn?: boolean;
  position: "top" | "bottom";
  /** Shows ghosted placeholder captured pieces (lobby mode) */
  isLobby?: boolean;
}

export function PlayerBar({
  name,
  rating,
  profileImageUrl,
  clock,
  capturedPieces,
  isYou,
  isActiveTurn,
  position,
  isLobby,
}: PlayerBarProps) {
  const barClass =
    position === "top" ? styles.playerBarTop : styles.playerBarBottom;

  return (
    <div className={`${styles.playerBar} ${barClass}`}>
      <div className={styles.playerLeft}>
        <PlayerAvatar name={name} profileImageUrl={profileImageUrl} isYou={isYou} />
        <div className={styles.playerMiddle}>
          <span className={styles.playerName}>
            {name}
            <span className={styles.playerRatingInline}>
              {" "}({rating != null ? rating : "—"})
            </span>
          </span>
          {isLobby ? (
            <span className={styles.capturedInline} style={{ opacity: 0.4 }}>
              <span style={{ fontSize: "0.85rem" }}>♟ ♟</span>
            </span>
          ) : capturedPieces ? (
            <CapturedInline pieces={capturedPieces} />
          ) : null}
        </div>
      </div>
      <div className={`${styles.timer} ${isActiveTurn ? styles.timerActive : ""}`}>
        {clock.slice(0, 5)}
      </div>
    </div>
  );
}
