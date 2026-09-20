"use client";

import React, { useState } from "react";
import styles from "./ChessBoard.module.css";
import { formatTime } from "../../hooks/useChessGame";
import type { UserProfile } from "../../types/profile";
import TimeController, { type GameVariant } from "./TimeControllers";
import { PlayChessMenu } from "./PlayChessMenu";
import { TimeGroup } from "@/lib/timeControls";
import { WatchList } from "./WatchList";

interface AuthUser {
  id: string;
  username: string;
  rating: number;
}

interface ArenaLobbyProps {
  user?: AuthUser | null;
  profile?: UserProfile | null;
  isChecking: boolean;
  isSearching: boolean;
  searchStatus: string | null;
  searchTimer: number;
  searchCancelled?: boolean;
  onStartSearch: () => void;
  onCancelSearch: () => void;
  setTimeControl: (selected: string) => void;
  setIsRatedGame: (isRated: boolean) => void;
  isRated: boolean;
  time_slot: { label: string; value: string };
  group: TimeGroup;
  gameVariant: "standard" | "chess960";
  setGameVariant: (v: "standard" | "chess960") => void;
}

export function ArenaLobby({
  user,
  profile,
  isChecking,
  isSearching,
  searchStatus,
  searchTimer,
  searchCancelled,
  setTimeControl,
  setIsRatedGame,
  onStartSearch,
  onCancelSearch,
  isRated,
  time_slot,
  group,
  gameVariant,
  setGameVariant,
}: ArenaLobbyProps) {
  const [view, setView] = useState<"menu" | "newGame">("menu");

  if (isChecking) {
    return (
      <div className={styles.arenaChecking}>
        <div className={styles.arenaSpinnerWrap}>
          <div className={styles.arenaSpinner} />
          <span className={styles.arenaCheckingPiece}>♜</span>
        </div>
        <p className={styles.arenaCheckingText}>
          Loading arena
          <span className={styles.arenaCheckingDots} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </p>
      </div>
    );
  }

  if (isSearching) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
          alignItems: "stretch",
        }}
      >
        {/* Searching indicator */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1rem",
            padding: "1.5rem 1rem",
            background: "rgba(10,18,8,0.5)",
            border: "1px solid rgba(124,163,95,0.12)",
            borderRadius: "10px",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background:
                "linear-gradient(145deg, rgba(93,171,58,0.2), rgba(20,40,15,0.9))",
              border: "1px solid rgba(93,171,58,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2rem",
              animation: "globeBreath 2s ease-in-out infinite",
              boxShadow: "0 0 24px rgba(93,171,58,0.15)",
            }}
          >
            ♜
          </div>

          <div style={{ textAlign: "center" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.35rem",
              }}
            >
              <span
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  color: "#a8e07a",
                }}
              >
                {searchStatus || "Finding opponent"}
              </span>
              <span className={styles.searchingDots} aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </div>
            <p
              style={{
                fontSize: "0.78rem",
                color: "#4a6340",
                marginTop: "0.3rem",
                fontFamily: "monospace",
              }}
            >
              {formatTime(searchTimer)} elapsed
            </p>
          </div>
        </div>

        <button
          onClick={onCancelSearch}
          type="button"
          style={{
            width: "100%",
            padding: "0.7rem",
            background: "rgba(200,60,60,0.08)",
            border: "1px solid rgba(200,60,60,0.25)",
            borderRadius: "7px",
            color: "#d06060",
            fontWeight: 700,
            fontSize: "0.88rem",
            cursor: "pointer",
            transition: "background 0.15s ease",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "rgba(200,60,60,0.15)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "rgba(200,60,60,0.08)")
          }
        >
          Cancel Search
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
      }}
    >
      {view === "menu" ? (
        <>
          <PlayChessMenu onPlayOnline={() => setView("newGame")} />
          <WatchList enabled />
        </>
      ) : (
        <div className="py-3">
          {/* Back to menu */}
          <button
            type="button"
            onClick={() => setView("menu")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              background: "none",
              border: "none",
              color: "#7fa568",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: "0.85rem",
              padding: 0,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "#c8e6a8";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "#7fa568";
            }}
          >
            ← Back to Play Chess
          </button>
          <TimeController
            setTimeControl={setTimeControl}
            setIsRatedGame={setIsRatedGame}
            onStartSearch={onStartSearch}
            isRated={isRated}
            time_slot={time_slot}
            group={group}
            gameVariant={gameVariant}
            setGameVariant={setGameVariant}
          />
        </div>
      )}
    </div>
  );
}
