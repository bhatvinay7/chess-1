"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, ChevronRight, ChevronLeft, Settings2 } from "lucide-react";
import { BOT_CHARACTERS, type BotCharacter } from "@/lib/botCharacters";
import { FloatingTimeControls } from "./FloatingTimeControls";
import { BotCard } from "./BotCard";
import { ColorPicker, type ColorChoice } from "./ColorPicker";
import styles from "./BotSetup.module.css";

interface BotSetupProps {
  onStart: (bot: BotCharacter, playerColor: "white" | "black", timeSlot: string) => void;
}

function skillToStars(level: number): number {
  return Math.max(1, Math.round((level / 20) * 5));
}

function skillToPct(level: number): number {
  return Math.round(5 + (level / 20) * 95);
}

function ColorLabel({ choice }: { choice: ColorChoice }) {
  if (choice === "random") return <span className={styles.matchSummaryAccent}>Random</span>;
  return <span className={styles.matchSummaryAccent}>{choice === "white" ? "♔ White" : "♚ Black"}</span>;
}

export function BotSetup({ onStart }: BotSetupProps) {
  const [selectedBot, setSelectedBot] = useState<BotCharacter>(BOT_CHARACTERS[2]!);
  const [colorChoice, setColorChoice] = useState<ColorChoice>("white");
  const [timeSlot, setTimeSlot]       = useState("10+0");
  const [settingsOpen, setSettingsOpen] = useState(true);

  const handleStart = () => {
    const color: "white" | "black" =
      colorChoice === "random"
        ? Math.random() < 0.5 ? "white" : "black"
        : colorChoice;
    onStart(selectedBot, color, timeSlot);
  };

  const stars     = skillToStars(selectedBot.skillLevel);
  const diffPct   = skillToPct(selectedBot.skillLevel);
  const accentHex = selectedBot.accentColor;

  return (
    <div className={styles.root}>
      <div className={styles.inner}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.headerTitle}>Play vs Bot</h1>
          <span className={styles.headerSub}>Challenge the engine · Train your skills</span>
        </div>

        {/* Body */}
        <div className={styles.body}>

          {/* Left column */}
          <div className={styles.leftCol}>
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedBot.id}
                className={styles.heroCard}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                style={{
                  border: `1px solid ${accentHex}44`,
                  background: `linear-gradient(135deg, ${accentHex}22 0%, ${accentHex}0c 45%, rgba(8,14,6,0.92) 100%)`,
                  boxShadow: `0 0 60px ${accentHex}22, 0 8px 32px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.1) inset`,
                }}
              >
                {/* Radial glow behind the avatar */}
                <div
                  className={styles.heroGlow}
                  style={{
                    background: `radial-gradient(ellipse at 12% 50%, ${accentHex}28 0%, transparent 58%)`,
                  }}
                />
                <div className={styles.heroBody}>
                  <motion.div
                    className={styles.heroAvatar}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    style={{
                      background: `${accentHex}20`,
                      border: `3px solid ${accentHex}55`,
                      boxShadow: `0 0 28px ${accentHex}30`,
                    }}
                  >
                    {selectedBot.avatar}
                  </motion.div>

                  <div className={styles.heroInfo}>
                    <div className={styles.heroName}>{selectedBot.name}</div>

                    <div className={styles.heroBadgeRow}>
                      <span
                        className={styles.heroTitleBadge}
                        style={{
                          background: `${accentHex}22`,
                          color: accentHex,
                          border: `1px solid ${accentHex}44`,
                        }}
                      >
                        {selectedBot.title}
                      </span>
                      <span className={styles.heroEloBadge}>{selectedBot.elo} ELO</span>
                    </div>

                    <div className={styles.heroDesc}>{selectedBot.description}</div>

                    <div className={styles.difficultyRow}>
                      <span className={styles.difficultyLabel}>Difficulty</span>
                      <div className={styles.difficultyBar}>
                        <motion.div
                          className={styles.difficultyFill}
                          initial={{ width: "0%" }}
                          animate={{ width: `${diffPct}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                          style={{ background: `linear-gradient(90deg, ${accentHex}88, ${accentHex})` }}
                        />
                      </div>
                      <span
                        className={styles.difficultyStars}
                        style={{ color: accentHex }}
                      >
                        {"★".repeat(stars)}{"☆".repeat(5 - stars)}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Roster */}
            <div className={styles.rosterSection}>
              <div className={styles.sectionLabel}>Choose Opponent</div>
              <div className={styles.rosterGrid}>
                {BOT_CHARACTERS.map((bot) => (
                  <BotCard
                    key={bot.id}
                    bot={bot}
                    selected={selectedBot.id === bot.id}
                    onSelect={() => setSelectedBot(bot)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right: collapsible dark settings panel */}
          <motion.div
            className={styles.settingsPanel}
            animate={{ width: settingsOpen ? 320 : 48 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {/* Toggle button */}
            <button
              type="button"
              className={styles.settingsToggle}
              onClick={() => setSettingsOpen(!settingsOpen)}
              title={settingsOpen ? "Collapse settings" : "Expand settings"}
            >
              {settingsOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            {/* Collapsed vertical label */}
            <AnimatePresence>
              {!settingsOpen && (
                <motion.div
                  className={styles.settingsCollapsedLabel}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Settings2 size={14} style={{ color: "var(--text-faint)" }} />
                  <span>SETTINGS</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Panel content */}
            <AnimatePresence>
              {settingsOpen && (
                <motion.div
                  key="settings-inner"
                  className={styles.settingsInner}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18, delay: 0.05 }}
                >
                  <div className={styles.settingSection}>
                    <div className={styles.sectionLabel}>⏱ Time Control</div>
                    <FloatingTimeControls selected={timeSlot} onSelect={setTimeSlot} />
                  </div>

                  <div className={styles.settingsDivider} />

                  <div className={styles.settingSection}>
                    <div className={styles.sectionLabel}>♟ Your Color</div>
                    <ColorPicker value={colorChoice} onChange={setColorChoice} />
                  </div>

                  <div className={styles.settingsDivider} />

                  <div className={styles.matchSummary}>
                    <ColorLabel choice={colorChoice} />
                    <span>vs</span>
                    <span className={styles.matchSummaryAccent} style={{ color: accentHex }}>
                      {selectedBot.avatar} {selectedBot.name}
                    </span>
                    <span style={{ color: "var(--text-faint)" }}>·</span>
                    <span className={styles.matchSummaryAccent}>{timeSlot}</span>
                  </div>

                  <motion.button
                    type="button"
                    className={styles.startBtn}
                    onClick={handleStart}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Play size={16} fill="currentColor" />
                    Start Game
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
