"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { GraduationCap } from "lucide-react";
import { COACH_OPENINGS, type CoachOpening } from "@/lib/coachOpenings";
import type { CoachGameConfig } from "@/hooks/useCoachGame";
import styles from "./CoachSetup.module.css";

interface CoachSetupProps {
  onStart: (config: CoachGameConfig) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  "open":        "Open Games (1.e4 e5)",
  "semi-open":   "Semi-Open (1.e4 …)",
  "closed":      "Closed (1.d4)",
  "semi-closed": "Semi-Closed (1.d4 …)",
  "flank":       "Flank Openings",
};

const CATEGORIES = ["open", "semi-open", "closed", "semi-closed", "flank"] as const;

const spring = { type: "spring", stiffness: 400, damping: 28 } as const;

export function CoachSetup({ onStart }: CoachSetupProps) {
  const [selected, setSelected] = useState<CoachOpening>(COACH_OPENINGS[0]!);
  const reduced = useReducedMotion();

  const handleStart = () => {
    onStart({ opening: selected, playerColor: selected.playerColor });
  };

  return (
    <div className={styles.page}>
      {/* ── Coach intro ── */}
      <motion.div
        className={styles.intro}
        initial={reduced ? {} : { opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
      >
        <motion.div
          className={styles.coachAvatar}
          initial={reduced ? {} : { scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ ...spring, delay: 0.08 }}
        >
          ♟
        </motion.div>
        <div className={styles.introText}>
          <h1 className={styles.coachName}>Coach Chatur</h1>
          <p className={styles.coachTagline}>
            I'll guide you through theory move by move — up to 30 moves of opening book,
            then engine-level play. Pick an opening to master.
          </p>
        </div>
      </motion.div>

      {/* ── Opening grid ── */}
      <div className={styles.content}>
        {CATEGORIES.map((cat, catIdx) => {
          const group = COACH_OPENINGS.filter((o) => o.category === cat);
          if (group.length === 0) return null;
          return (
            <motion.div
              key={cat}
              className={styles.group}
              initial={reduced ? {} : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: catIdx * 0.06 }}
            >
              <h2 className={styles.groupTitle}>{CATEGORY_LABELS[cat]}</h2>
              <div className={styles.grid}>
                {group.map((opening, cardIdx) => {
                  const isSelected = selected.id === opening.id;
                  return (
                    <motion.button
                      key={opening.id}
                      type="button"
                      onClick={() => setSelected(opening)}
                      className={`${styles.card} ${isSelected ? styles.cardSelected : ""}`}
                      style={{ "--accent": opening.accentColor } as React.CSSProperties}
                      initial={reduced ? {} : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...spring, delay: catIdx * 0.06 + cardIdx * 0.03 }}
                      whileHover={reduced ? {} : { y: -2, transition: { duration: 0.15 } }}
                      whileTap={reduced ? {} : { scale: 0.98 }}
                    >
                      <span className={styles.cardEmoji}>{opening.emoji}</span>
                      <div className={styles.cardBody}>
                        <div className={styles.cardTop}>
                          <span className={styles.cardName}>{opening.name}</span>
                          <span className={styles.cardEco}>{opening.eco}</span>
                        </div>
                        <p className={styles.cardDesc}>{opening.description}</p>
                        <span className={styles.colorPill} data-color={opening.playerColor}>
                          {opening.playerColor === "white" ? "♔ You play White" : "♚ You play Black"}
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Sticky start bar ── */}
      <div className={styles.startBar}>
        <div className={styles.startBarInner}>
          <AnimatePresence mode="wait">
            <motion.div
              key={selected.id}
              className={styles.startBarInfo}
              initial={reduced ? {} : { opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={spring}
            >
              <span style={{ color: "var(--accent, #81b64c)", fontSize: "1.3rem" }}>{selected.emoji}</span>
              <div>
                <div className={styles.startBarName}>{selected.name}</div>
                <div className={styles.startBarSide}>
                  {selected.playerColor === "white" ? "♔ Playing as White" : "♚ Playing as Black"}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <motion.button
            type="button"
            onClick={handleStart}
            className={styles.startBtn}
            whileHover={reduced ? {} : { scale: 1.04, filter: "brightness(1.12)" }}
            whileTap={reduced ? {} : { scale: 0.97 }}
          >
            <GraduationCap size={16} style={{ display: "inline", marginRight: "0.45rem", verticalAlign: "text-bottom" }} />
            Start Lesson
          </motion.button>
        </div>
      </div>
    </div>
  );
}
