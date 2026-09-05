"use client";

import React, { useRef, useEffect } from "react";
import { Settings, PanelLeftClose, PanelLeftOpen, Moon, Sun, HelpCircle, LogOut } from "lucide-react";
import Link from "next/link";
import styles from "./SettingsDropdown.module.css";

interface SettingsDropdownProps {
  onClose: () => void;
  onLogout: () => void;
  collapsed: boolean;
  darkUI: boolean;
  onToggleCollapse: () => void;
  onToggleDarkUI: () => void;
}

export function SettingsDropdown({
  onClose,
  onLogout,
  collapsed,
  darkUI,
  onToggleCollapse,
  onToggleDarkUI,
}: SettingsDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const s = makeStyles(darkUI);

  return (
    <div ref={ref} style={s.root}>

      <div style={s.toggleRow}>
        <div style={s.toggleLeft}>
          {darkUI ? <Moon size={14} color="#81b64c" /> : <Sun size={14} color="#f28b38" />}
          <div style={s.toggleTextGroup}>
            <span style={s.toggleLabel}>Appearance</span>
            <span style={s.toggleValue}>{darkUI ? "Dark mode" : "Light mode"}</span>
          </div>
        </div>
        <button type="button" style={s.toggleSwitch} onClick={onToggleDarkUI} aria-label={darkUI ? "Switch to light mode" : "Switch to dark mode"}>
          <span style={s.toggleThumb} />
        </button>
      </div>
      <div style={s.divider} />

      {/* ── Menu items ── */}
      <Link href="/settings" style={s.item} onClick={onClose}>
        <Settings size={14} style={{ flexShrink: 0 }} />
        <span style={s.label}>All Settings</span>
      </Link>

      <button
        type="button"
        className={styles.desktopOnly}
        style={s.item}
        onClick={() => { onToggleCollapse(); onClose(); }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = s.hoverBg; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        {collapsed
          ? <PanelLeftOpen  size={14} style={{ flexShrink: 0 }} />
          : <PanelLeftClose size={14} style={{ flexShrink: 0 }} />
        }
        <span style={s.label}>{collapsed ? "Expand Sidebar" : "Collapse Sidebar"}</span>
      </button>

      <button
        type="button"
        style={s.item}
        onClick={onClose}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = s.hoverBg; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        <HelpCircle size={14} style={{ flexShrink: 0 }} />
        <span style={s.label}>Help & Support</span>
      </button>

      <div style={s.divider} />

      <button
        type="button"
        style={{ ...s.item, color: "#e05555" }}
        onClick={() => { onLogout(); onClose(); }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(224,85,85,0.08)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        <LogOut size={14} style={{ flexShrink: 0 }} />
        <span style={s.label}>Log Out</span>
      </button>
    </div>
  );
}

function makeStyles(dark: boolean) {
  const textPrimary = dark ? "rgba(255,255,255,0.9)" : "#17211b";
  const textMuted = dark ? "rgba(255,255,255,0.48)" : "#5a6e50";
  const borderColor = dark ? "rgba(255,255,255,0.09)" : "rgba(23,33,27,0.08)";
  const hoverBg = dark ? "rgba(255,255,255,0.07)" : "rgba(31,122,77,0.06)";
  const rootBg = dark ? "rgba(26,26,26,0.98)" : "rgba(255,255,255,0.98)";
  const rootBorder = dark ? "rgba(255,255,255,0.13)" : "rgba(23,33,27,0.1)";

  return {
    root: {
      position: "absolute" as const,
      bottom: "calc(100% + 6px)",
      left: 0,
      right: 0,
      background: rootBg,
      border: `1px solid ${rootBorder}`,
      borderRadius: "12px",
      boxShadow: dark ? "0 18px 48px rgba(0,0,0,0.5)" : "0 18px 48px rgba(28,45,35,0.14)",
      backdropFilter: "blur(14px)",
      WebkitBackdropFilter: "blur(14px)",
      overflow: "hidden",
      animation: "dropdownSlideUp 0.15s ease",
      zIndex: 700,
      minWidth: "210px",
    } as React.CSSProperties,

    toggleRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", padding: "0.75rem 0.9rem" } as React.CSSProperties,
    toggleLeft: { display: "flex", alignItems: "center", gap: "0.55rem" } as React.CSSProperties,
    toggleTextGroup: { display: "flex", flexDirection: "column", gap: "1px" } as React.CSSProperties,
    toggleLabel: { fontSize: "0.82rem", fontWeight: 700, color: textPrimary, lineHeight: 1.2 } as React.CSSProperties,
    toggleValue: { fontSize: "0.68rem", color: textMuted, lineHeight: 1 } as React.CSSProperties,
    toggleSwitch: { position: "relative", width: "36px", height: "20px", borderRadius: "99px", background: dark ? "rgba(129,182,76,0.4)" : "rgba(0,0,0,0.12)", border: dark ? "1px solid rgba(129,182,76,0.55)" : "1px solid rgba(0,0,0,0.14)", cursor: "pointer", flexShrink: 0, padding: 0 } as React.CSSProperties,
    toggleThumb: { position: "absolute", top: "50%", left: dark ? "calc(100% - 18px)" : "3px", transform: "translateY(-50%)", width: "14px", height: "14px", borderRadius: "50%", background: dark ? "#aad48a" : "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.25)" } as React.CSSProperties,

    /* ── Divider ── */
    divider: {
      height: "1px",
      background: borderColor,
      margin: "0 0.5rem",
    } as React.CSSProperties,

    /* ── Menu items ── */
    item: {
      display: "flex",
      alignItems: "center",
      gap: "0.6rem",
      padding: "0.55rem 0.9rem",
      background: "transparent",
      border: "none",
      width: "100%",
      textAlign: "left" as const,
      cursor: "pointer",
      textDecoration: "none",
      transition: "background 0.12s",
      fontSize: "0.84rem",
      fontWeight: 600,
      color: textPrimary,
      fontFamily: "inherit",
    } as React.CSSProperties,
    label: {
      flex: 1,
      lineHeight: 1,
    } as React.CSSProperties,
    hoverBg: hoverBg,
  };
}
