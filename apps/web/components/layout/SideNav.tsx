"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useNotifications } from "../../hooks/useInvites";
import {
  History,
  Settings,
  Share2,
  Swords,
  User,
  X,
  Copy,
  Bell,
  Users,
  Mail,
  Bot,
  ArrowLeft,
  LayoutGrid,
  Gamepad2,
  Monitor,
  BookOpen,
  Lock,
  Crown,
  Eye,
  Trophy,
  Shield,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useState, useEffect } from "react";
import type { RootState, AppDispatch } from "../../store";
import {
  toggleSidebarPanel,
  closeSidebarPanel,
  closeMobileNav,
  toggleCollapsed,
  toggleDarkUI,
} from "../../store/slices/sidebarSlice";
import { useAuth } from "../../hooks/useAuth";
import { useProfile } from "../../hooks/useProfile";
import { SettingsDropdown } from "./SettingsDropdown";
import styles from "./SideNav.module.css";

/* ── Share popup ─────────────────────────────────────────────────────────── */

function SharePopup({
  onClose,
  offset,
}: {
  onClose: () => void;
  offset: number;
}) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? window.location.href : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.popupOverlay}>
      <div className={styles.popupBackdrop} onClick={onClose} />
      <div className={styles.popup} style={{ left: offset + 8 }}>
        <div className={styles.popupHeader}>
          <span className={styles.popupTitle}>Share Game</span>
          <button className={styles.popupClose} onClick={onClose} type="button">
            <X size={13} />
          </button>
        </div>
        <div className={styles.popupBody}>
          <div className={styles.shareLink}>
            <input
              className={styles.shareLinkInput}
              readOnly
              value={url}
              onFocus={(e) => e.target.select()}
            />
            <button
              className={styles.shareCopyBtn}
              onClick={handleCopy}
              type="button"
            >
              {copied ? (
                "Copied!"
              ) : (
                <>
                  <Copy size={12} /> Copy
                </>
              )}
            </button>
          </div>
          <p className={styles.shareNote}>
            Share this link so anyone can watch or review the game.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Nav links ───────────────────────────────────────────────────────────── */

const PLAY_LINKS = [
  { href: "/arena", label: "Play", icon: <Swords size={17} /> },
  { href: "/arena/bot", label: "vs Bot", icon: <Bot size={17} /> },
  { href: "/arena/coach", label: "Coach", icon: <BookOpen size={17} /> },
  { href: "/tournament", label: "Tournament", icon: <Trophy size={17} /> },
  { href: "/watch", label: "Watch", icon: <Eye size={17} /> },
  { href: "/clubs", label: "Clubs", icon: <Shield size={17} /> },
  { href: "/history", label: "History", icon: <History size={17} /> },
  { href: "/profile", label: "Profile", icon: <User size={17} /> },
  { href: "/friends", label: "Friends", icon: <Users size={17} /> },
];

const SETTINGS_ITEMS = [
  {
    id: "board-pieces",
    label: "Board & Pieces",
    icon: <LayoutGrid size={17} />,
  },
  { id: "gameplay", label: "Gameplay", icon: <Gamepad2 size={17} /> },
  { id: "profile", label: "Profile", icon: <User size={17} /> },
  { id: "interface", label: "Interface", icon: <Monitor size={17} /> },
  { id: "social", label: "Social", icon: <Users size={17} /> },
  { id: "coach", label: "Coach", icon: <BookOpen size={17} /> },
  { id: "notifications", label: "Notifications", icon: <Bell size={17} /> },
  { id: "account", label: "Account", icon: <Lock size={17} /> },
  { id: "membership", label: "Membership", icon: <Crown size={17} /> },
  { id: "accessibility", label: "Accessibility", icon: <Eye size={17} /> },
];

/* ── Main SideNav ─────────────────────────────────────────────────────────── */

export default function SideNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();
  const openPanel = useSelector((s: RootState) => s.sidebar.openPanel);
  const mobileNavOpen = useSelector((s: RootState) => s.sidebar.mobileNavOpen);
  const collapsed = useSelector((s: RootState) => s.sidebar.collapsed);
  const darkUI = useSelector((s: RootState) => s.sidebar.darkUI);
  const { user, logout } = useAuth(null);
  const { data: profile } = useProfile(user?.id);
  const { unreadCount, fetchNotifications } = useNotifications();
  const [showGearMenu, setShowGearMenu] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
    }
  }, [user?.id, fetchNotifications]);

  if (pathname.startsWith("/auth") || pathname === "/") {
    return null;
  }

  const isSettings = pathname.startsWith("/settings");
  const activeSection = searchParams.get("section") ?? "board-pieces";

  const handleClose = () => dispatch(closeSidebarPanel());
  const handleMobileClose = () => dispatch(closeMobileNav());

  const navClass = [
    styles.sidenav,
    mobileNavOpen ? styles.sidenavMobileOpen : "",
    collapsed ? styles.sidenavCollapsed : "",
    darkUI ? styles.sidenavDark : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {mobileNavOpen && (
        <div className={styles.mobileBackdrop} onClick={handleMobileClose} />
      )}

      <nav className={navClass}>
        {/* ── Logo ── */}
        <div className={styles.logoHeader}>
          <Link
            href="/"
            className={styles.logo}
            onClick={handleMobileClose}
            title="Rooky"
          >
            <span className={styles.logoMark}>♜</span>
            <span className={styles.logoText}>Rooky</span>
          </Link>
          <button
            type="button"
            className={styles.mobileCloseBtn}
            aria-label="Close navigation"
            onClick={handleMobileClose}
          >
            <X size={18} />
          </button>
        </div>

        {isSettings ? (
          /* ── Settings nav ── */
          <div className={styles.navSection}>
            <span className={styles.navLabel}>Settings</span>

            <Link
              href="/arena"
              className={styles.navItem}
              onClick={handleMobileClose}
              title="Back to Play"
            >
              <span className={styles.navIcon}>
                <ArrowLeft size={17} />
              </span>
              <span className={styles.navItemLabel}>Back to Play</span>
            </Link>

            <div className={styles.sectionDivider} />

            {SETTINGS_ITEMS.map(({ id, label, icon }) => (
              <Link
                key={id}
                href={`/settings?section=${id}`}
                className={`${styles.navItem} ${activeSection === id ? styles.navItemActive : ""}`}
                onClick={handleMobileClose}
                title={label}
              >
                <span className={styles.navIcon}>{icon}</span>
                <span className={styles.navItemLabel}>{label}</span>
              </Link>
            ))}
          </div>
        ) : (
          /* ── Play nav ── */
          <>
            <div className={styles.navSection}>
              <span className={styles.navLabel}>Play</span>

              {PLAY_LINKS.map(({ href, label, icon }) => {
                const active =
                  href === "/arena"
                    ? pathname === "/arena" ||
                      (pathname.startsWith("/arena/") &&
                        !pathname.startsWith("/arena/bot"))
                    : href === "/arena/bot"
                      ? pathname.startsWith("/arena/bot")
                      : pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
                    onClick={handleMobileClose}
                    title={label}
                  >
                    <span className={styles.navIcon}>{icon}</span>
                    <span className={styles.navItemLabel}>{label}</span>
                  </Link>
                );
              })}
            </div>

            <div className={styles.sectionDivider} />

            <div className={styles.navSection}>
              <span className={styles.navLabel}>Preferences</span>

              <button
                type="button"
                className={`${styles.navItem} ${openPanel === "share" ? styles.navItemOpen : ""}`}
                onClick={() => dispatch(toggleSidebarPanel("share"))}
                title="Share"
              >
                <span className={styles.navIcon}>
                  <Share2 size={17} />
                </span>
                <span className={styles.navItemLabel}>Share</span>
              </button>
            </div>
          </>
        )}

        {/* ── Spacer ── */}
        <div className={styles.spacer} />

        {/* ── User row / auth buttons ── */}
        {user === undefined ? (
          <div
            className={styles.authSection}
            style={{ opacity: 0, pointerEvents: "none" }}
          >
            <Link href="#" className={styles.authBtnOutline}>
              <span className={styles.navItemLabel}>Loading</span>
            </Link>
          </div>
        ) : user ? (
          <div className={styles.userSection}>
            <div className={styles.userRow}>
              <div className={styles.userAvatar} title={user.username}>
                {profile?.profileImageUrl ? (
                  <img
                    src={profile.profileImageUrl}
                    alt={user.username}
                    crossOrigin="anonymous"
                  />
                ) : (
                  user.username.charAt(0).toUpperCase()
                )}
              </div>
              <div className={styles.userMeta}>
                <span className={styles.userName}>
                  {profile?.username ?? user.username}
                </span>
                <span className={styles.userRating}>
                  {user.rating ?? 1500} ELO
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.authSection}>
            <Link
              href="/auth/login"
              className={styles.authBtnOutline}
              title="Sign In"
            >
              <span className={styles.navItemLabel}>Sign In</span>
            </Link>
            <Link
              href="/auth/signup"
              className={styles.authBtnPrimary}
              title="Sign Up"
            >
              <span className={styles.navItemLabel}>Sign Up</span>
            </Link>
          </div>
        )}

        {/* ── Bottom icon bar ── */}
        <div className={styles.iconBar}>
          <Link
            href="/friends"
            className={styles.iconBarBtn}
            title="Friends"
            aria-label="Friends"
          >
            <Users size={16} />
          </Link>

          <button
            type="button"
            className={styles.iconBarBtn}
            title="Messages"
            aria-label="Messages"
          >
            <Mail size={16} />
            <span className={styles.iconBadge}>1</span>
          </button>

          <Link
            href="/notifications"
            className={styles.iconBarBtn}
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className={styles.iconBadge}>{unreadCount}</span>
            )}
          </Link>

          <div className={styles.iconBarGearWrap}>
            <button
              type="button"
              aria-label="Settings"
              title="Settings"
              className={`${styles.iconBarBtn} ${showGearMenu ? styles.iconBarBtnActive : ""}`}
              onClick={() => setShowGearMenu((v) => !v)}
            >
              <Settings size={16} />
            </button>

            {showGearMenu && (
              <SettingsDropdown
                onClose={() => setShowGearMenu(false)}
                onLogout={logout}
                collapsed={collapsed}
                darkUI={darkUI}
                onToggleCollapse={() => dispatch(toggleCollapsed())}
                onToggleDarkUI={() => dispatch(toggleDarkUI())}
              />
            )}
          </div>
        </div>
      </nav>

      {/* ── Share popup ── */}
      {openPanel === "share" && (
        <SharePopup onClose={handleClose} offset={collapsed ? 56 : 220} />
      )}
    </>
  );
}
