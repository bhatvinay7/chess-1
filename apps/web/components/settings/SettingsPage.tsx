"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSettings } from "../../hooks/useSettings";
import { useBoardTheme } from "../../hooks/useBoardTheme";
import { BoardPiecesSettings } from "./BoardPiecesSettings";
import { GameplaySettings } from "./GameplaySettings";
import { ProfileSettings } from "./ProfileSettings";
import styles from "./SettingsPage.module.css";

/* ── Section slug → label map ───────────────────────────────────────────── */

const SECTION_SUBTITLES: Record<string, string> = {
  "board-pieces": "Customize the look and feel of your chess board and pieces.",
  gameplay: "Control game behavior, animations, and audio preferences.",
  profile: "Update your display name, avatar, and public profile.",
  interface: "Adjust the layout and visual appearance of the app.",
  social: "Manage friend requests, blocking, and messaging settings.",
  coach: "Configure coaching mode and hint preferences.",
  notifications: "Choose which alerts and emails you receive.",
  account: "Manage your account security and linked devices.",
  membership: "View your membership status and subscription details.",
  accessibility: "Enable features for improved accessibility.",
};

const SECTION_LABELS: Record<string, string> = {
  "board-pieces": "Board & Pieces",
  gameplay: "Gameplay",
  profile: "Profile",
  interface: "Interface",
  social: "Social",
  coach: "Coach",
  notifications: "Notifications",
  account: "Account",
  membership: "Membership",
  accessibility: "Accessibility",
};

const PLACEHOLDER_ICONS: Record<string, string> = {
  profile: "👤",
  interface: "🖥",
  social: "👥",
  coach: "🎓",
  notifications: "🔔",
  account: "🔑",
  membership: "⭐",
  accessibility: "♿",
};

/* ── Inner content (uses useSearchParams) ───────────────────────────────── */

function SettingsContent() {
  const searchParams = useSearchParams();
  const section = searchParams.get("section") ?? "board-pieces";

  const { settings, updateSetting } = useSettings();
  const { savedThemeId, saveTheme } = useBoardTheme();

  const title = SECTION_LABELS[section] ?? "Settings";
  const subtitle = SECTION_SUBTITLES[section] ?? "";

  return (
    <div className={styles.root}>
      <main className={styles.main}>
        <h1 className={styles.mainTitle}>{title}</h1>
        <p className={styles.mainSubtitle}>{subtitle}</p>

        {section === "board-pieces" && (
          <BoardPiecesSettings
            settings={settings}
            savedThemeId={savedThemeId}
            onSaveBoardTheme={saveTheme}
            onUpdateSetting={updateSetting}
          />
        )}

        {section === "gameplay" && (
          <GameplaySettings
            settings={settings}
            onUpdateSetting={updateSetting}
          />
        )}

        {section === "profile" && <ProfileSettings />}

        {section !== "board-pieces" &&
          section !== "gameplay" &&
          section !== "profile" && (
            <PlaceholderSection
              icon={PLACEHOLDER_ICONS[section] ?? "⚙"}
              label={title}
            />
          )}
      </main>
    </div>
  );
}

/* ── Placeholder for unimplemented sections ─────────────────────────────── */

function PlaceholderSection({ icon, label }: { icon: string; label: string }) {
  return (
    <div className={styles.comingSoon}>
      <span>{icon}</span>
      <p>
        <strong>{label}</strong> settings coming soon.
      </p>
    </div>
  );
}

/* ── Exported page component ────────────────────────────────────────────── */

export function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsContent />
    </Suspense>
  );
}
