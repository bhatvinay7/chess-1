"use client";

import { useSelector } from "react-redux";
import type { RootState } from "../../../store";

export type ColorChoice = "white" | "black" | "random";

const OPTIONS: { id: ColorChoice; label: string; icon: string }[] = [
  { id: "white",  label: "White",  icon: "♔" },
  { id: "random", label: "Random", icon: "🎲" },
  { id: "black",  label: "Black",  icon: "♚" },
];

interface ColorPickerProps {
  value: ColorChoice;
  onChange: (c: ColorChoice) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const darkUI = useSelector((s: RootState) => s.sidebar.darkUI);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.4rem" }}>
      {OPTIONS.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.22rem",
              padding: "0.6rem 0.3rem",
              borderRadius: "9px",
              cursor: "pointer",
              transition: "all 0.14s ease",
              // glass button
              background: active 
                ? (darkUI ? "rgba(255,255,255,0.14)" : "rgba(93,171,58,0.14)") 
                : "var(--glass-bg-light)",
              border: `1px solid ${active 
                ? (darkUI ? "rgba(255,255,255,0.35)" : "rgba(93,171,58,0.5)") 
                : "var(--glass-border-light)"}`,
              color: active 
                ? (darkUI ? "#ffffff" : "#3a7020") 
                : (darkUI ? "rgba(200,230,200,0.55)" : "#4a6e38"),
              fontWeight: active ? 800 : 600,
              boxShadow: active
                ? (darkUI ? "0 4px 16px rgba(255,255,255,0.08), var(--glass-inset)" : "0 4px 16px rgba(93,171,58,0.12)")
                : "var(--glass-inset-sm)",
            }}
          >
            <span style={{ fontSize: "1.35rem", lineHeight: 1 }}>{o.icon}</span>
            <span style={{ fontSize: "0.75rem", letterSpacing: "0.03em" }}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
