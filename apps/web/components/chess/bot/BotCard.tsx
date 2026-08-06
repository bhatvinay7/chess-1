"use client";

import { motion } from "framer-motion";
import type { BotCharacter } from "@/lib/botCharacters";

interface BotCardProps {
  bot: BotCharacter;
  selected: boolean;
  onSelect: () => void;
}

export function BotCard({ bot, selected, onSelect }: BotCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileHover={{ scale: 1.04, y: -2 }}
      whileTap={{ scale: 0.97 }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.22rem",
        padding: "0.6rem 0.3rem",
        borderRadius: "10px",
        cursor: "pointer",
        transition: "box-shadow 0.15s ease",
        background: selected ? `${bot.accentColor}20` : "var(--card-bg)",
        border: `1px solid ${selected ? bot.accentColor + "60" : "var(--card-border)"}`,
        boxShadow: selected
          ? `0 0 20px ${bot.accentColor}28, var(--glass-inset)`
          : "0 2px 8px rgba(0,0,0,0.12), var(--glass-inset-sm)",
      }}
    >
      <div
        style={{
          width: "34px",
          height: "34px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.3rem",
          background: selected ? `${bot.accentColor}28` : "var(--input-bg)",
          border: `1px solid ${selected ? bot.accentColor + "50" : "var(--card-border)"}`,
          color: bot.accentColor,
          transition: "all 0.14s ease",
        }}
      >
        {bot.avatar}
      </div>

      {/* Bot name */}
      <div style={{
        fontSize: "0.68rem",
        fontWeight: 700,
        color: selected ? bot.accentColor : "var(--text-primary)",
        textAlign: "center",
        lineHeight: 1.2,
        textShadow: selected ? `0 0 8px ${bot.accentColor}66` : "none",
      }}>
        {bot.name}
      </div>

      {/* Bot title */}
      <div style={{
        fontSize: "0.58rem",
        fontWeight: 600,
        color: selected ? bot.accentColor : "var(--text-faint)",
        lineHeight: 1,
        transition: "color 0.14s",
      }}>
        {bot.title}
      </div>

      {/* Bot ELO */}
      <div style={{
        fontSize: "0.6rem",
        color: "var(--text-faint)",
        fontFamily: "monospace",
        transition: "color 0.14s",
      }}>
        {bot.elo}
      </div>
    </motion.button>
  );
}
