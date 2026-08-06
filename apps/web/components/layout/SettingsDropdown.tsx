"use client";

import React, { useRef, useEffect } from "react";
import {
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Moon,
  Sun,
  HelpCircle,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";

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
  const currentDarkUI = useSelector((s: RootState) => s.sidebar.darkUI);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const s = makeStyles(currentDarkUI);

  return (
    <div ref={ref} style={s.root}>

      {/* ── Dark mode toggle row ── */}
      <div style={s.toggleRow}>
        <div style={s.toggleLeft}>
          {currentDarkUI
            ? <Moon size={14} style={{ color: "#81b64c", flexShrink: 0 }} />
            : <Sun  size={14} style={{ color: "#f28b38", flexShrink: 0 }} />
          }
          <div style={s.toggleTextGroup}>
            <span style={s.toggleLabel}>Appearance</span>
            <span style={s.toggleValue}>
              {currentDarkUI ? "Dark mode" : "Light mode"}
            </span>
          </div>
        </div>
        <button
          type="button"
          style={s.toggleSwitch}
          onClick={onToggleDarkUI}
          aria-label={currentDarkUI ? "Switch to light mode" : "Switch to dark mode"}
        >
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
  const textPrimary  = dark ? "rgba(255,255,255,0.88)" : "#1a2416";
  const textMuted    = dark ? "rgba(255,255,255,0.44)" : "#5a6e50";
  const borderColor  = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const hoverBg      = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
  const rootBg       = dark ? "rgba(26,26,26,0.98)"    : "rgba(255,255,255,0.98)";
  const rootBorder   = dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)";
  const toggleBg     = dark ? "rgba(129,182,76,0.35)"  : "rgba(0,0,0,0.1)";
  const thumbLeft    = dark ? "calc(100% - 18px)"      : "3px";
  const thumbColor   = dark ? "#aad48a"                : "rgba(255,255,255,0.9)";

  return {
    root: {
      position: "absolute" as const,
      bottom: "calc(100% + 6px)",
      left: 0,
      right: 0,
      background: rootBg,
      border: `1px solid ${rootBorder}`,
      borderRadius: "12px",
      boxShadow: dark
        ? "0 16px 48px rgba(0,0,0,0.55)"
        : "0 8px 32px rgba(0,0,0,0.14)",
      backdropFilter: "blur(14px)",
      WebkitBackdropFilter: "blur(14px)",
      overflow: "hidden",
      animation: "dropdownSlideUp 0.15s ease",
      zIndex: 700,
      minWidth: "210px",
    } as React.CSSProperties,

    /* ── Dark mode toggle row ── */
    toggleRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "0.75rem",
      padding: "0.75rem 0.9rem",
    } as React.CSSProperties,
    toggleLeft: {
      display: "flex",
      alignItems: "center",
      gap: "0.55rem",
    } as React.CSSProperties,
    toggleTextGroup: {
      display: "flex",
      flexDirection: "column" as const,
      gap: "1px",
    } as React.CSSProperties,
    toggleLabel: {
      fontSize: "0.82rem",
      fontWeight: 700,
      color: textPrimary,
      lineHeight: 1.2,
    } as React.CSSProperties,
    toggleValue: {
      fontSize: "0.68rem",
      color: textMuted,
      lineHeight: 1,
    } as React.CSSProperties,
    toggleSwitch: {
      position: "relative" as const,
      width: "36px",
      height: "20px",
      borderRadius: "99px",
      background: dark ? "rgba(129,182,76,0.4)" : "rgba(0,0,0,0.12)",
      border: dark
        ? "1px solid rgba(129,182,76,0.55)"
        : "1px solid rgba(0,0,0,0.14)",
      cursor: "pointer",
      flexShrink: 0,
      transition: "background 0.2s, border-color 0.2s",
      padding: 0,
    } as React.CSSProperties,
    toggleThumb: {
      position: "absolute" as const,
      top: "50%",
      left: thumbLeft,
      transform: "translateY(-50%)",
      width: "14px",
      height: "14px",
      borderRadius: "50%",
      background: thumbColor,
      transition: "left 0.2s, background 0.2s",
      boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
    } as React.CSSProperties,

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
