"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Swords, PlusCircle, Clock } from "lucide-react";
import type { GameRoomState } from "../../hooks/useSocket/useGameRoom";

interface ResumeGameModalProps {
  pendingGame: GameRoomState;
  onResume: () => void;
  onNewGame: () => void;
}

export function ResumeGameModal({ pendingGame, onResume, onNewGame }: ResumeGameModalProps) {
  const timeLabel = pendingGame.time_slot
    ? pendingGame.time_slot.replace("+", " + ") + " min"
    : "Active game";

  return (
    <AnimatePresence>
      <motion.div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.65)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "clamp(12px, 4vw, 20px)",
          overflowY: "auto",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          style={{
            width: "380px",
            maxWidth: "100%",
            maxHeight: "calc(100dvh - 24px)",
            background: "#1a2a14",
            border: "1px solid rgba(93,171,58,0.25)",
            borderRadius: "12px",
            overflowX: "hidden",
            overflowY: "auto",
            boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
          }}
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
        >
          {/* Header */}
          <div
            style={{
              background: "linear-gradient(to bottom, rgba(93,171,58,0.18), rgba(10,18,8,0))",
              borderBottom: "1px solid rgba(93,171,58,0.15)",
              padding: "22px 24px 18px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "50%",
                background: "rgba(93,171,58,0.15)",
                border: "1px solid rgba(93,171,58,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px",
                fontSize: "1.6rem",
              }}
            >
              ♜
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: "1.15rem",
                fontWeight: 700,
                color: "#c8e6a8",
              }}
            >
              You have an active game
            </h2>
            <p
              style={{
                margin: "6px 0 0",
                fontSize: "0.8rem",
                color: "#5a7a50",
              }}
            >
              Would you like to resume where you left off?
            </p>
          </div>

          {/* Game info */}
          <div
            style={{
              padding: "14px 24px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(0,0,0,0.2)",
              borderBottom: "1px solid rgba(93,171,58,0.08)",
            }}
          >
            <Clock size={14} color="#5a7a50" />
            <span style={{ fontSize: "0.82rem", color: "#7fa568" }}>
              {timeLabel}
            </span>
            {pendingGame.isRated && (
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  color: "#a8e07a",
                  background: "rgba(93,171,58,0.12)",
                  border: "1px solid rgba(93,171,58,0.2)",
                  borderRadius: "4px",
                  padding: "2px 7px",
                }}
              >
                Rated
              </span>
            )}
          </div>

          {/* Actions */}
          <div
            style={{
              padding: "18px 24px 20px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <button
              type="button"
              onClick={onResume}
              style={{
                width: "100%",
                height: "44px",
                borderRadius: "8px",
                border: "none",
                background: "linear-gradient(135deg, #5dab3a, #4a8f2e)",
                color: "#fff",
                fontWeight: 700,
                fontSize: "0.9rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "filter 0.15s ease",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = "brightness(1.1)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = "brightness(1)"; }}
            >
              <Swords size={16} />
              Resume Game
            </button>

            <button
              type="button"
              onClick={onNewGame}
              style={{
                width: "100%",
                height: "44px",
                borderRadius: "8px",
                border: "1px solid rgba(93,171,58,0.2)",
                background: "rgba(10,18,8,0.5)",
                color: "#7fa568",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(93,171,58,0.08)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(10,18,8,0.5)"; }}
            >
              <PlusCircle size={16} />
              New Game
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ResumeGameModal;
