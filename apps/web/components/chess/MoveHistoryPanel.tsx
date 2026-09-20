"use client";

import React, { useState, useMemo } from "react";
import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Flag,
  Handshake,
  Plus,
  RotateCcw,
  Search,
  BookOpen,
} from "lucide-react";
import styles from "./ChessBoard.module.css";
import type { GameRoomState } from "../../hooks/useSocket/useGameRoom";

export interface MovePair {
  white: string;
  whiteTimeTakenMs?: number;
  black?: string;
  blackTimeTakenMs?: number;
}

type TabId = "moves" | "info" | "openings";

interface MoveHistoryPanelProps {
  pairs: MovePair[];
  currentMoveIdx: number;
  moveCount: number;
  /** Whether it is currently this player's turn (gates the draw offer button) */
  isMyTurn: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  /** Full game state — used to populate the Info tab */
  gameState: GameRoomState | null;
  /** Active game ID displayed in the Info tab */
  gameId: string | null;
  /** When true, shows Game Review / New Game / Rematch controls */
  isGameOver: boolean;
  /** When true, hides draw/resign buttons and post-game actions */
  isSpectator?: boolean;
  onSelectMove: (index: number) => void;
  onFirstMove: () => void;
  onPreviousMove: () => void;
  onNextMove: () => void;
  onLastMove: () => void;
  onResign: () => void;
  onAbort?: () => void;
  canAbort?: boolean;
  onOfferDraw: () => void;
  /** Disables the draw button while an offer is already pending either way */
  isDrawOfferPending?: boolean;
  onNewGame: () => void;
  onRematch: () => void;
  /** Called when spectator clicks Analyse after game ends */
  onAnalyse?: () => void;
}

const WHITE_PIECE: Record<string, string> = {
  K: "♔",
  Q: "♕",
  R: "♖",
  B: "♗",
  N: "♘",
};
const BLACK_PIECE: Record<string, string> = {
  K: "♚",
  Q: "♛",
  R: "♜",
  B: "♝",
  N: "♞",
};

function renderSan(san: string, side: "white" | "black"): React.ReactNode {
  const icons = side === "white" ? WHITE_PIECE : BLACK_PIECE;
  const icon = icons[san.charAt(0)];
  if (!icon) return <>{san}</>;
  return (
    <>
      <span className={styles.pieceIcon}>{icon}</span>
      {san.slice(1)}
    </>
  );
}

function formatMoveTime(ms: number): string {
  const s = ms / 1000;
  if (s >= 60) {
    const m = Math.floor(s / 60);
    const rem = Math.floor(s % 60);
    return `${m}:${rem.toString().padStart(2, "0")}`;
  }
  return s.toFixed(1);
}

function getTimeSpeedClass(ms?: number): string {
  if (!ms || ms <= 0) return "";
  const s = ms / 1000;
  if (s < 3) return styles.moveTimeInstant ?? "";
  if (s < 10) return styles.moveTimeFast ?? "";
  if (s < 30) return styles.moveTimeMedium ?? "";
  return styles.moveTimeSlow ?? "";
}

const TAB_LABELS: { id: TabId; label: string }[] = [
  { id: "moves", label: "Moves" },
  { id: "info", label: "Info" },
  { id: "openings", label: "Openings" },
];

export function MoveHistoryPanel({
  pairs,
  currentMoveIdx,
  moveCount,
  isMyTurn,
  scrollRef,
  gameState,
  gameId,
  isGameOver,
  isSpectator = false,
  onSelectMove,
  onFirstMove,
  onPreviousMove,
  onNextMove,
  onLastMove,
  onResign,
  onAbort,
  canAbort = false,
  onOfferDraw,
  isDrawOfferPending = false,
  onNewGame,
  onRematch,
  onAnalyse,
}: MoveHistoryPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("moves");

  const maxMs = useMemo(() => {
    let max = 1;
    for (const p of pairs) {
      if (p.whiteTimeTakenMs && p.whiteTimeTakenMs > max)
        max = p.whiteTimeTakenMs;
      if (p.blackTimeTakenMs && p.blackTimeTakenMs > max)
        max = p.blackTimeTakenMs;
    }
    return max;
  }, [pairs]);

  return (
    <section className={styles.movePanel} aria-label="Move history">
      {/* ── Tab bar ──────────────────────────────────────────────────── */}
      <div className={styles.tabBar}>
        {TAB_LABELS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={`${styles.tab} ${activeTab === id ? styles.tabActive : ""}`}
            onClick={() => setActiveTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Moves tab ────────────────────────────────────────────────── */}
      {activeTab === "moves" && (
        <div className={styles.moveTableScroll} ref={scrollRef}>
          {/* Sticky header */}
          <div className={styles.moveTableHeader}>
            <span className={styles.moveHeaderCell}>#</span>
            <span className={styles.moveHeaderCell}>White</span>
            <span className={styles.moveHeaderCell}>Black</span>
            <span className={styles.moveHeaderCell} />
          </div>

          {pairs.length === 0 ? (
            <div className={styles.emptyMoves}>
              <span className={styles.emptyMovesIcon}>♜</span>
              <p>Game started. Make your move.</p>
            </div>
          ) : (
            pairs.map((pair, i) => {
              const whiteIdx = i * 2;
              const blackIdx = i * 2 + 1;
              const isWhiteCurrent = currentMoveIdx === whiteIdx;
              const isBlackCurrent =
                pair.black != null && currentMoveIdx === blackIdx;
              const whitePct = pair.whiteTimeTakenMs
                ? Math.min(100, (pair.whiteTimeTakenMs / maxMs) * 100)
                : 0;
              const blackPct = pair.blackTimeTakenMs
                ? Math.min(100, (pair.blackTimeTakenMs / maxMs) * 100)
                : 0;

              return (
                <div key={i} className={styles.moveRow}>
                  <span className={styles.moveNum}>{i + 1}</span>

                  {/* White move */}
                  <button
                    className={`${styles.moveCell} ${isWhiteCurrent ? styles.moveCurrent : ""}`}
                    type="button"
                    onClick={() => onSelectMove(whiteIdx)}
                  >
                    <span className={styles.moveSan}>
                      {renderSan(pair.white, "white")}
                    </span>
                  </button>

                  {/* Black move */}
                  <button
                    className={`${styles.moveCell} ${isBlackCurrent ? styles.moveCurrent : ""}`}
                    type="button"
                    onClick={() =>
                      pair.black != null ? onSelectMove(blackIdx) : undefined
                    }
                    disabled={pair.black == null}
                  >
                    {pair.black != null && (
                      <span className={styles.moveSan}>
                        {renderSan(pair.black, "black")}
                      </span>
                    )}
                  </button>

                  {/* Time column — stacked white/black bars */}
                  <div className={styles.moveTimeCol}>
                    {pair.whiteTimeTakenMs != null &&
                      pair.whiteTimeTakenMs > 0 && (
                        <div className={styles.moveTimePair}>
                          <div className={styles.moveTimeBarTrack}>
                            <div
                              className={styles.moveTimeBarFill}
                              style={{ width: `${whitePct}%` }}
                            />
                          </div>
                          <span
                            className={`${styles.moveTimeNum} ${getTimeSpeedClass(pair.whiteTimeTakenMs)}`}
                          >
                            {formatMoveTime(pair.whiteTimeTakenMs)}
                          </span>
                        </div>
                      )}
                    {pair.blackTimeTakenMs != null &&
                      pair.blackTimeTakenMs > 0 && (
                        <div className={styles.moveTimePair}>
                          <div className={styles.moveTimeBarTrack}>
                            <div
                              className={styles.moveTimeBarFill}
                              style={{ width: `${blackPct}%` }}
                            />
                          </div>
                          <span
                            className={`${styles.moveTimeNum} ${getTimeSpeedClass(pair.blackTimeTakenMs)}`}
                          >
                            {formatMoveTime(pair.blackTimeTakenMs)}
                          </span>
                        </div>
                      )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Info tab ─────────────────────────────────────────────────── */}
      {activeTab === "info" && (
        <div className={styles.moveTableScroll}>
          <div className={styles.infoTab}>
            <div className={styles.infoRow}>
              <span className={styles.infoKey}>Game ID</span>
              <span className={styles.infoVal}>
                {gameId ? `${gameId.slice(0, 8)}…` : "—"}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoKey}>Status</span>
              <span className={styles.infoVal}>
                {gameState?.gameState ?? "—"}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoKey}>White</span>
              <span className={styles.infoVal}>
                {gameState?.whitePlayerId
                  ? `${gameState.whitePlayerId.slice(0, 8)}…`
                  : "—"}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoKey}>Black</span>
              <span className={styles.infoVal}>
                {gameState?.blackPlayerId
                  ? `${gameState.blackPlayerId.slice(0, 8)}…`
                  : "—"}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoKey}>Plies</span>
              <span className={styles.infoVal}>{moveCount}</span>
            </div>
            {gameState?.player1Rating && (
              <div className={styles.infoRow}>
                <span className={styles.infoKey}>White ELO</span>
                <span className={styles.infoVal}>
                  {gameState.player1Rating}
                </span>
              </div>
            )}
            {gameState?.player2Rating && (
              <div className={styles.infoRow}>
                <span className={styles.infoKey}>Black ELO</span>
                <span className={styles.infoVal}>
                  {gameState.player2Rating}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Openings tab ─────────────────────────────────────────────── */}
      {activeTab === "openings" && (
        <div className={styles.moveTableScroll}>
          <div className={styles.emptyMoves}>
            <span className={styles.emptyMovesIcon}>
              <BookOpen size={28} strokeWidth={1.5} />
            </span>
            <p>Opening detection coming soon.</p>
          </div>
        </div>
      )}

      {/* ── Always-visible bottom controls ───────────────────────────── */}
      <div className={styles.panelControls}>
        {/* Game Review button — only after game ends, not for spectators */}
        {isGameOver && !isSpectator && (
          <button type="button" className={styles.reviewBtn}>
            <Search size={14} />
            Game Review
          </button>
        )}

        {/* Analyse — only for spectators after game ends */}
        {isGameOver && isSpectator && onAnalyse && (
          <button
            type="button"
            className={styles.actionBtnFull}
            onClick={onAnalyse}
          >
            <Search size={13} />
            Analyse Game
          </button>
        )}

        {/* New Game — only after game ends, not for spectators */}
        {isGameOver && !isSpectator && (
          <button
            type="button"
            className={styles.actionBtnFull}
            onClick={onNewGame}
          >
            <Plus size={13} />
            New Game
          </button>
        )}

        {/* Navigation arrows */}
        <div className={styles.navControls}>
          <button
            className={styles.navBtn}
            title="First move"
            type="button"
            onClick={onFirstMove}
          >
            <ChevronFirst size={15} />
          </button>
          <button
            className={styles.navBtn}
            title="Previous move"
            type="button"
            onClick={onPreviousMove}
          >
            <ChevronLeft size={15} />
          </button>
          <button
            className={styles.navBtn}
            title="Next move"
            type="button"
            onClick={onNextMove}
          >
            <ChevronRight size={15} />
          </button>
          <button
            className={styles.navBtn}
            title="Last move"
            type="button"
            onClick={onLastMove}
          >
            <ChevronLast size={15} />
          </button>
        </div>

        {/* Draw / Resign — only while game is in progress, never for spectators */}
        {!isGameOver && !isSpectator && (
          <div className={styles.resignRow}>
            <button
              onClick={onOfferDraw}
              className={styles.drawBtn}
              disabled={isDrawOfferPending || !isMyTurn}
              title={
                !isMyTurn
                  ? "You can only offer a draw on your turn"
                  : isDrawOfferPending
                    ? "Draw offer pending"
                    : "Offer a draw"
              }
              type="button"
            >
              <Handshake size={14} />
              Draw
            </button>
            {canAbort ? (
              <button
                onClick={onAbort}
                className={styles.resignBtn}
                type="button"
              >
                Abort
              </button>
            ) : (
              <button
                onClick={onResign}
                className={styles.resignBtn}
                type="button"
              >
                <Flag size={14} />
                Resign
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
