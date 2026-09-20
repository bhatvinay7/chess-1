"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type {
  TournamentListItem,
  CreateTournamentPayload,
  TournamentType,
  TournamentStatus,
} from "./types";
import { TOURNAMENT_TYPE_CONFIGS } from "./TournamentTypesSidebar";
import TournamentList from "./TournamentList";
import CreateTournamentModal from "./CreateTournamentModal";
import {
  fetchTournaments,
  fetchMyTournaments,
  createTournament,
  joinTournament,
  type TournamentsResponse,
} from "../../app/lib/api/tournaments";
import { WatchList } from "../chess/WatchList";
import styles from "./TournamentPage.module.css";

type Tab = "current" | "future" | "ended" | "watch" | "create";
type ListTab = "current" | "future" | "ended";

const TAB_STATUSES: Record<ListTab, string> = {
  current: "IN_PROGRESS",
  future: "DRAFT,REGISTRATION_OPEN,REGISTRATION_CLOSED,NOT_INITIALIZED",
  ended: "COMPLETED,CANCELLED",
};

const STATUS_BUCKETS: Record<ListTab, TournamentStatus[]> = {
  current: ["IN_PROGRESS"],
  future: [
    "DRAFT",
    "REGISTRATION_OPEN",
    "REGISTRATION_CLOSED",
    "NOT_INITIALIZED",
  ],
  ended: ["COMPLETED", "CANCELLED"],
};

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function TournamentPage() {
  const router = useRouter();
  const now = useClock();

  const [tab, setTab] = useState<Tab>("current");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [formatFilter, setFormatFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<TournamentType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  // Per-tab tournament data — only fetched when the user visits that tab
  const [tabData, setTabData] = useState<
    Partial<Record<"current" | "future" | "ended", TournamentListItem[]>>
  >({});
  // My tournaments fetched once, then filtered per tab client-side
  const [myTournaments, setMyTournaments] = useState<TournamentListItem[]>([]);
  const loadedTabsRef = useRef(new Set<string>());
  const myFetchedRef = useRef(false);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadTab = useCallback(
    async (targetTab: "current" | "future" | "ended") => {
      const needsTab = !loadedTabsRef.current.has(targetTab);
      const needsMine = !myFetchedRef.current;
      if (!needsTab && !needsMine) return;

      setLoading(true);
      try {
        // fetchMyTournaments failing (e.g. 401) must NOT block the public tournament list
        const [tabResult, mineResult] = await Promise.all([
          needsTab
            ? fetchTournaments({ statuses: TAB_STATUSES[targetTab] })
            : Promise.resolve(null),
          needsMine
            ? fetchMyTournaments().catch(() => null)
            : Promise.resolve(null),
        ]);
        if (tabResult) {
          loadedTabsRef.current.add(targetTab);
          setTabData((prev) => ({
            ...prev,
            [targetTab]: tabResult.data ?? [],
          }));
        }
        // Mark as fetched even if it returned null (avoids retrying on every tab switch)
        if (needsMine) {
          myFetchedRef.current = true;
          setMyTournaments(mineResult?.data ?? []);
        }
      } catch {
        // fetchTournaments itself failed
        if (needsTab) setTabData((prev) => ({ ...prev, [targetTab]: [] }));
      } finally {
        setLoading(false);
      }
    },
    [],
  ); // stable — uses refs for guards

  // Fetch the tab's data on mount (default "current") and whenever the user switches tabs
  useEffect(() => {
    if (tab === "current" || tab === "future" || tab === "ended") {
      loadTab(tab);
    }
  }, [tab, loadTab]);

  const handleJoin = async (id: string) => {
    setJoiningId(id);
    try {
      await joinTournament(id);
      showToast("Joined tournament!");
      // Force-refresh the current tab and my-tournaments
      if (tab === "current" || tab === "future" || tab === "ended") {
        loadedTabsRef.current.delete(tab);
        myFetchedRef.current = false;
        await loadTab(tab);
      }
      router.push(`/tournament/${id}`);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Could not join tournament.";
      showToast(msg, "error");
    } finally {
      setJoiningId(null);
    }
  };

  const handleCreate = async (payload: CreateTournamentPayload) => {
    setSubmitting(true);
    try {
      const res = await createTournament(payload);
      setShowModal(false);
      showToast("Tournament created!");
      // Invalidate current tab so the new tournament appears
      loadedTabsRef.current.delete("current");
      myFetchedRef.current = false;
      await loadTab("current");
      if (res.data?.id) router.push(`/tournament/${res.data.id}`);
    } catch {
      showToast("Failed to create tournament.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = useCallback(() => {
    if (tab !== "current" && tab !== "future" && tab !== "ended") return;
    loadedTabsRef.current.delete(tab);
    myFetchedRef.current = false;
    loadTab(tab);
  }, [tab, loadTab]);

  const applyFilters = (list: TournamentListItem[]) =>
    list.filter((t) => {
      if (search && !t.name.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (typeFilter !== "ALL" && t.tournamentType !== typeFilter) return false;
      if (formatFilter === "ARENA" && t.tournamentType !== "ARENA")
        return false;
      if (
        formatFilter === "SWISS" &&
        !["CLUB_SWISS", "GLOBAL_SWISS"].includes(t.tournamentType)
      )
        return false;
      return true;
    });

  const isListTab = tab === "current" || tab === "future" || tab === "ended";
  const listTab = isListTab ? (tab as ListTab) : null;
  const displayed = applyFilters(listTab ? (tabData[listTab] ?? []) : []);
  const displayedMine = applyFilters(
    listTab
      ? myTournaments.filter((t) => STATUS_BUCKETS[listTab].includes(t.status))
      : [],
  );

  const dateStr = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className={styles.page}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.trophy}>🏆</span>
          <h1 className={styles.title}>Tournaments</h1>
          <span className={styles.headerMeta}>
            {dateStr} {timeStr}
          </span>
        </div>
      </header>

      {/* ── Tab bar ────────────────────────────────────────────────────── */}
      <nav className={styles.tabBar}>
        {(
          [
            { id: "current", icon: "⚡", label: "Current" },
            { id: "future", icon: "📅", label: "Upcoming" },
            { id: "ended", icon: "✓", label: "Ended" },
            { id: "watch", icon: "👁", label: "Watch" },
            { id: "create", icon: "+", label: "Create" },
          ] as { id: Tab; icon: string; label: string }[]
        ).map(({ id, icon, label }) => (
          <button
            key={id}
            type="button"
            className={`${styles.tabBtn} ${tab === id ? styles.tabActive : ""}`}
            onClick={() => setTab(id)}
          >
            <span className={styles.tabIcon}>{icon}</span>
            {label}
          </button>
        ))}
      </nav>

      {/* ── Filter bar ─────────────────────────────────────────────────── */}
      {(tab === "current" || tab === "future" || tab === "ended") && (
        <div className={styles.filterBar}>
          <div className={styles.searchWrap}>
            <svg className={styles.searchIcon} viewBox="0 0 16 16" fill="none">
              <circle
                cx="6.5"
                cy="6.5"
                r="5"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M10.5 10.5L14 14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <input
              className={styles.searchInput}
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className={styles.filterSelect}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="ALL">All Types</option>
            <option value="ARENA">Arena</option>
            <option value="CLUB_SWISS">Club Swiss</option>
            <option value="GLOBAL_SWISS">Global Swiss</option>
            <option value="CLUB_ROUND_ROBIN">Round Robin</option>
            <option value="GLOBAL_ROUND_ROBIN">Global R.R.</option>
            <option value="DAILY">Daily</option>
          </select>
          <select
            className={styles.filterSelect}
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value)}
          >
            <option value="ALL">All Formats</option>
            <option value="ARENA">Arena</option>
            <option value="SWISS">Swiss</option>
          </select>
        </div>
      )}

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className={styles.content}>
        {(tab === "current" || tab === "future" || tab === "ended") && (
          <TournamentList
            tournaments={displayed}
            myTournaments={displayedMine}
            loading={loading}
            onJoin={handleJoin}
            joiningId={joiningId}
            onRetry={handleRetry}
            now={now}
            emptyLabel={
              tab === "ended"
                ? "No ended tournaments"
                : tab === "current"
                  ? "No live tournaments"
                  : "No upcoming tournaments"
            }
            emptySub={
              tab === "ended"
                ? "Completed and cancelled tournaments appear here once they finish."
                : tab === "current"
                  ? "No tournaments are in progress right now."
                  : "Tournaments open for registration will appear here."
            }
          />
        )}

        {tab === "watch" && (
          <WatchList enabled={tab === "watch"} layout="list" />
        )}

        {tab === "create" && (
          <CreateView
            onOpen={(type) => {
              setModalType(type);
              setShowModal(true);
            }}
          />
        )}
      </div>

      {showModal && (
        <CreateTournamentModal
          onClose={() => {
            setShowModal(false);
            setModalType(null);
          }}
          onSubmit={handleCreate}
          submitting={submitting}
          defaultType={modalType ?? undefined}
        />
      )}

      {toast && (
        <div className={`${styles.toast} ${styles[`toast_${toast.type}`]}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ─── Schedule View ────────────────────────────────────────────────────────────

function dayLabel(d: Date, now: Date): string {
  const todayStr = now.toDateString();
  const tomorrowStr = new Date(now.getTime() + 86_400_000).toDateString();
  if (d.toDateString() === todayStr) return "Today";
  if (d.toDateString() === tomorrowStr) return "Tomorrow";
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function ScheduleView({
  tournaments,
  now,
}: {
  tournaments: TournamentListItem[];
  now: Date;
}) {
  const nowMs = now.getTime();
  const cutoffMs = nowMs + 7 * 24 * 60 * 60 * 1000;

  const upcoming = tournaments
    .filter((t) => {
      if (!t.timeManagement) return false;
      const endMs = t.timeManagement.endTime
        ? new Date(t.timeManagement.endTime).getTime()
        : new Date(t.timeManagement.startTime).getTime() + 2 * 3_600_000;
      const startMs = new Date(t.timeManagement.startTime).getTime();
      return endMs > nowMs && startMs < cutoffMs;
    })
    .sort(
      (a, b) =>
        new Date(a.timeManagement!.startTime).getTime() -
        new Date(b.timeManagement!.startTime).getTime(),
    );

  // Group by calendar day
  const byDay = new Map<string, TournamentListItem[]>();
  for (const t of upcoming) {
    const key = new Date(t.timeManagement.startTime).toDateString();
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(t);
  }

  if (byDay.size === 0) {
    return (
      <div className={styles.scheduleListEmpty}>
        No tournaments scheduled in the next 7 days
      </div>
    );
  }

  return (
    <div className={styles.scheduleList}>
      {Array.from(byDay.entries()).map(([dateKey, dayTournaments]) => {
        const dayDate = new Date(dayTournaments[0]!.timeManagement.startTime);

        // Group within a day by start-hour slot
        const byHour = new Map<string, TournamentListItem[]>();
        for (const t of dayTournaments) {
          const slotKey = new Date(
            t.timeManagement!.startTime,
          ).toLocaleTimeString("en-US", {
            hour: "numeric",
            hour12: true,
          });
          if (!byHour.has(slotKey)) byHour.set(slotKey, []);
          byHour.get(slotKey)!.push(t);
        }

        return (
          <div key={dateKey} className={styles.slotDay}>
            <div className={styles.slotDayHeader}>
              <span className={styles.slotDayLabel}>
                {dayLabel(dayDate, now)}
              </span>
              <span className={styles.slotDayDate}>
                {dayDate.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>

            {Array.from(byHour.entries()).map(([slotKey, slotTournaments]) => (
              <div key={slotKey} className={styles.slotGroup}>
                <div className={styles.slotTime}>{slotKey}</div>
                <div className={styles.slotCards}>
                  {slotTournaments.map((t) => {
                    const cfg = TOURNAMENT_TYPE_CONFIGS.find(
                      (c) => c.id === t.tournamentType,
                    );
                    const isLive = t.status === "IN_PROGRESS";
                    return (
                      <div key={t.id} className={styles.slotCard}>
                        <span
                          className={styles.slotCardIcon}
                          style={{ color: cfg?.color ?? "#7a7673" }}
                        >
                          {cfg?.symbol ?? "♟"}
                        </span>
                        <div className={styles.slotCardBody}>
                          <span className={styles.slotCardName}>{t.name}</span>
                          <span className={styles.slotCardMeta}>
                            {t.timeControl?.label ?? "—"}
                            {" · "}
                            {t.participantCount}
                            {t.maxPlayers ? `/${t.maxPlayers}` : ""} players
                          </span>
                        </div>
                        {isLive && <span className={styles.slotLiveDot} />}
                        <span
                          className={styles.slotCardStatus}
                          style={{
                            color: isLive
                              ? "#81b64c"
                              : (cfg?.color ?? "#7a7673"),
                          }}
                        >
                          {isLive
                            ? "Live"
                            : t.status.replace(/_/g, " ").toLowerCase()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─── Create View ──────────────────────────────────────────────────────────────

interface CreateOption {
  type: TournamentType;
  icon: string;
  label: string;
  desc: string;
}

interface CreateSection {
  id: string;
  label: string;
  sublabel: string;
  accentColor: string;
  options: CreateOption[];
}

const CREATE_SECTIONS: CreateSection[] = [
  {
    id: "club",
    label: "Club",
    sublabel: "For members of your club",
    accentColor: "#4b9de8",
    options: [
      {
        type: "CLUB_SWISS",
        icon: "♖",
        label: "Club Swiss",
        desc: "Paired rounds for club members using the Swiss pairing system. 4–2000 players.",
      },
      {
        type: "CLUB_ROUND_ROBIN",
        icon: "♞",
        label: "Club Round Robin",
        desc: "Every club member plays each other once. Ideal for club leagues.",
      },
    ],
  },
  {
    id: "global",
    label: "Global",
    sublabel: "Open to all players worldwide",
    accentColor: "#9b6fe8",
    options: [
      {
        type: "GLOBAL_SWISS",
        icon: "♜",
        label: "Global Swiss",
        desc: "Open Swiss tournament for all players. Share the link worldwide. 4–2000 players.",
      },
      {
        type: "GLOBAL_ROUND_ROBIN",
        icon: "♝",
        label: "Global Round Robin",
        desc: "World-open round robin league — everyone plays everyone.",
      },
    ],
  },
  {
    id: "open",
    label: "Open Format",
    sublabel: "Time-based or correspondence",
    accentColor: "#e85d5d",
    options: [
      {
        type: "ARENA",
        icon: "⚔",
        label: "Arena",
        desc: "Score as many points as possible in the allotted time. 4+ players.",
      },
    ],
  },
];

function CreateView({ onOpen }: { onOpen: (type: TournamentType) => void }) {
  return (
    <div className={styles.createView}>
      <p className={styles.createPrompt}>
        Please select the kind of event you&apos;d like to create:
      </p>
      <div className={styles.createGroups}>
        {CREATE_SECTIONS.map((section) => (
          <div key={section.id} className={styles.createGroup}>
            {/* Section header */}
            <div
              className={styles.createGroupHeader}
              style={{ borderLeftColor: section.accentColor }}
            >
              <span
                className={styles.createGroupLabel}
                style={{ color: section.accentColor }}
              >
                {section.label}
              </span>
              <span className={styles.createGroupSub}>{section.sublabel}</span>
            </div>

            {/* Options */}
            <div className={styles.createOptions}>
              {section.options.map((opt) => {
                const cfg = TOURNAMENT_TYPE_CONFIGS.find(
                  (c) => c.id === opt.type,
                );
                return (
                  <button
                    key={opt.type}
                    type="button"
                    className={styles.createOption}
                    onClick={() => onOpen(opt.type)}
                    style={
                      {
                        "--opt-color": cfg?.color ?? section.accentColor,
                      } as React.CSSProperties
                    }
                  >
                    <span
                      className={styles.createOptionIcon}
                      style={{ color: cfg?.color ?? section.accentColor }}
                    >
                      {opt.icon}
                    </span>
                    <div className={styles.createOptionBody}>
                      <span className={styles.createOptionLabel}>
                        {opt.label}
                      </span>
                      <span className={styles.createOptionDesc}>
                        {opt.desc}
                      </span>
                    </div>
                    <span className={styles.createOptionArrow}>›</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
