"use client";

import React, { useRef, useEffect } from "react";
import { Settings, PanelLeftClose, PanelLeftOpen, HelpCircle, LogOut } from "lucide-react";
import Link from "next/link";

interface SettingsDropdownProps {
  onClose: () => void;
  onLogout: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function SettingsDropdown({
  onClose,
  onLogout,
  collapsed,
  onToggleCollapse,
}: SettingsDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const s = makeStyles();

  return (
    <div ref={ref} style={s.root}>

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

function makeStyles() {
  const textPrimary = "#17211b";
  const borderColor = "rgba(23,33,27,0.08)";
  const hoverBg = "rgba(31,122,77,0.06)";
  const rootBg = "rgba(255,255,255,0.98)";
  const rootBorder = "rgba(23,33,27,0.1)";

  return {
    root: {
      position: "absolute" as const,
      bottom: "calc(100% + 6px)",
      left: 0,
      right: 0,
      background: rootBg,
      border: `1px solid ${rootBorder}`,
      borderRadius: "12px",
      boxShadow: "0 18px 48px rgba(28,45,35,0.14)",
      backdropFilter: "blur(14px)",
      WebkitBackdropFilter: "blur(14px)",
      overflow: "hidden",
      animation: "dropdownSlideUp 0.15s ease",
      zIndex: 700,
      minWidth: "210px",
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
