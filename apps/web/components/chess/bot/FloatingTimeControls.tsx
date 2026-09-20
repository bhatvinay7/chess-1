"use client";

import { motion } from "framer-motion";
import { useSelector } from "react-redux";
import type { RootState } from "../../../store";
import { TIME_CONTROLS } from "@/lib/timeControls";

interface FloatingTimeControlsProps {
  selected: string;
  onSelect: (value: string) => void;
}

export function FloatingTimeControls({
  selected,
  onSelect,
}: FloatingTimeControlsProps) {
  const darkUI = useSelector((s: RootState) => s.sidebar.darkUI);

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
      {TIME_CONTROLS.map((group, gi) =>
        group.options.map((opt, oi) => {
          const active = selected === opt.value;
          const delay = (gi * group.options.length + oi) * 0.06;
          return (
            <motion.button
              key={opt.value}
              type="button"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: [0, -3, 0], opacity: 1 }}
              transition={{
                opacity: { delay, duration: 0.3 },
                y: {
                  delay,
                  duration: 0.35,
                  repeat: Infinity,
                  repeatDelay: 1.5 + oi * 0.3,
                  ease: "easeInOut",
                },
              }}
              onClick={() => onSelect(opt.value)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                padding: "0.32rem 0.6rem",
                borderRadius: "20px",
                fontSize: "0.76rem",
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontWeight: active ? 800 : 600,
                background: active
                  ? darkUI
                    ? "rgba(255,255,255,0.14)"
                    : "rgba(93,171,58,0.14)"
                  : "var(--glass-bg-light)",
                border: `1px solid ${
                  active
                    ? darkUI
                      ? "rgba(255,255,255,0.35)"
                      : "rgba(93,171,58,0.5)"
                    : "var(--glass-border-light)"
                }`,
                color: active
                  ? darkUI
                    ? "#ffffff"
                    : "#3a7020"
                  : darkUI
                    ? "rgba(200,230,200,0.65)"
                    : "#4a6e38",
                boxShadow: active ? "0 2px 12px rgba(93,171,58,0.2)" : "none",
                transition: "all 0.14s ease",
              }}
            >
              <span style={{ fontSize: "0.82rem" }}>{group.icon}</span>
              {opt.label}
            </motion.button>
          );
        }),
      )}
    </div>
  );
}
