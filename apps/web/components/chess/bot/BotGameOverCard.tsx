"use client";

import React from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { useSelector } from "react-redux";
import type { RootState } from "../../../store";

interface BotGameOverCardProps {
  outcome: "win" | "loss" | "draw";
  reason: string;
  botName: string;
  botAvatar: string;
  botAccent: string;
  userName: string;
  userRating: number;
  userAvatar: string;
  onAnalysis: () => void;
  onNewGame: () => void;
}

export function BotGameOverCard({
  outcome,
  reason,
  botName,
  botAvatar,
  botAccent,
  userName,
  userRating,
  userAvatar,
  onAnalysis,
  onNewGame,
}: BotGameOverCardProps) {
  const darkUI = useSelector((s: RootState) => s.sidebar.darkUI);
  const label = outcome === "win" ? "You Won!" : outcome === "loss" ? "You Lost" : "Draw";
  const labelColor = outcome === "win" ? "#6aaa44" : outcome === "loss" ? "#e84040" : "#c8b400";

  const s = makeStyles(darkUI);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      style={s.overlay}
    >
      <div style={s.card}>
        <div style={{ ...s.title, color: labelColor }}>{label}</div>
        <div style={s.reason}>{reason}</div>

        <div style={s.players}>
          <div style={s.player}>
            <div style={{ ...s.botAvatar, color: botAccent }}>{botAvatar}</div>
            <span style={s.playerName}>{botName}</span>
          </div>
          <span style={s.vs}>vs</span>
          <div style={s.player}>
            <img src={userAvatar} alt={userName} style={s.userAvatarImg} crossOrigin="anonymous" />
            <span style={s.playerName}>{userName}</span>
            <span style={s.rating}>{userRating}</span>
          </div>
        </div>

        <div style={s.btns}>
          <button type="button" style={s.analysisBtn} onClick={onAnalysis}>
            <Search size={14} />
            Analyse Game
          </button>
          <button type="button" style={s.newGameBtn} onClick={onNewGame}>
            New Game
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function makeStyles(darkUI: boolean): Record<string, React.CSSProperties> {
  return {
    overlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.65)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 100,
      backdropFilter: "blur(4px)",
    },
    card: {
      background: darkUI
        ? "linear-gradient(145deg, #1a2c14, #101e0c)"
        : "linear-gradient(145deg, #f5fbef, #eaf5e0)",
      border: darkUI
        ? "1px solid rgba(124,163,95,0.25)"
        : "1px solid rgba(124,163,95,0.3)",
      borderRadius: "14px",
      padding: "2rem 2.5rem",
      minWidth: "300px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "0.9rem",
      boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
    },
    title: {
      fontSize: "1.8rem",
      fontWeight: 900,
      letterSpacing: "0.01em",
    },
    reason: {
      fontSize: "0.85rem",
      color: darkUI ? "#8aaa78" : "#4a6e38",
      marginTop: "-0.4rem",
    },
    players: {
      display: "flex",
      alignItems: "center",
      gap: "1rem",
      marginTop: "0.3rem",
    },
    player: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "0.3rem",
    },
    botAvatar: {
      width: "48px",
      height: "48px",
      borderRadius: "50%",
      background: darkUI ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "1.5rem",
    },
    userAvatarImg: {
      width: "48px",
      height: "48px",
      borderRadius: "50%",
      objectFit: "cover",
    },
    playerName: {
      fontSize: "0.82rem",
      fontWeight: 700,
      color: darkUI ? "#c8e6a8" : "#27351f",
    },
    vs: {
      color: darkUI ? "#4a6340" : "#5a7848",
      fontSize: "1rem",
    },
    rating: {
      fontSize: "0.7rem",
      color: darkUI ? "#6a8a58" : "#5a7040",
    },
    btns: {
      display: "flex",
      gap: "0.6rem",
      marginTop: "0.5rem",
    },
    analysisBtn: {
      display: "flex",
      alignItems: "center",
      gap: "0.4rem",
      padding: "0.65rem 1.2rem",
      background: "rgba(93,171,58,0.18)",
      border: "1px solid rgba(93,171,58,0.4)",
      borderRadius: "7px",
      color: darkUI ? "#90d470" : "#3a7020",
      fontWeight: 700,
      fontSize: "0.88rem",
      cursor: "pointer",
    },
    newGameBtn: {
      padding: "0.65rem 1.2rem",
      background: darkUI ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
      border: darkUI ? "1px solid rgba(124,163,95,0.2)" : "1px solid rgba(124,163,95,0.3)",
      borderRadius: "7px",
      color: darkUI ? "#7fa568" : "#4a6e38",
      fontWeight: 700,
      fontSize: "0.88rem",
      cursor: "pointer",
    },
  };
}
