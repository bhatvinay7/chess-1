"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Users, Clock, RefreshCw, Swords, Trash2,
  Trophy, Wifi, WifiOff, ChevronRight, LayoutList, BarChart2, Info,
  Settings,
} from "lucide-react";
import type { TournamentListItem } from "./types";
import {
  fetchTournament, joinTournament, leaveTournament,
  deleteTournament, fetchMyTournamentGame,
} from "../../app/lib/api/tournaments";
import { useAuth } from "../../hooks/useAuth";
import { useTournamentView } from "../../hooks/useTournamentView";
import { TOURNAMENT_TYPE_CONFIGS } from "./TournamentTypesSidebar";
import TournamentOverview   from "./TournamentOverview";
import TournamentRounds     from "./TournamentRounds";
import TournamentStandings  from "./TournamentStandings";
import styles from "./TournamentDetail.module.css";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = "overview" | "rounds" | "standings";

interface Props { id: string }

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  DRAFT:               { label: "Draft",               cls: "draft"     },
  REGISTRATION_OPEN:   { label: "Registration Open",   cls: "open"      },
  REGISTRATION_CLOSED: { label: "Registration Closed", cls: "closed"    },
  NOT_INITIALIZED:     { label: "Starting Soon",       cls: "soon"      },
  IN_PROGRESS:         { label: "Live",                cls: "live"      },
  COMPLETED:           { label: "Completed",           cls: "done"      },
  CANCELLED:           { label: "Cancelled",           cls: "cancelled" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function useCountdown(targetMs: number | null) {
  const [diff, setDiff] = useState<number | null>(null);
  useEffect(() => {
    if (!targetMs) return;
    const tick = () => setDiff(targetMs - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetMs]);
  return diff;
}

function fmtCountdown(ms: number): string {
  if (ms <= 0) return "Now";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

// ── My Match card ─────────────────────────────────────────────────────────────

function MyMatchCard({
  myMatch, userId, accentColor, onPlay,
}: {
  myMatch:     Record<string, string> & { gameId: string };
  userId:      string;
  accentColor: string;
  onPlay:      (gameId: string) => void;
}) {
  const isWhite  = myMatch.white_player_id === userId;
  const me  = { username: isWhite ? myMatch.player1_username   : myMatch.player2_username,   rating: isWhite ? myMatch.player1_rating   : myMatch.player2_rating,   img: isWhite ? myMatch.player1_profile_image_url : myMatch.player2_profile_image_url };
  const opp = { username: isWhite ? myMatch.player2_username   : myMatch.player1_username,   rating: isWhite ? myMatch.player2_rating   : myMatch.player1_rating,   img: isWhite ? myMatch.player2_profile_image_url : myMatch.player1_profile_image_url };

  const startMs   = myMatch.left_game_start_time ? Number(myMatch.left_game_start_time) : null;
  const countdown = useCountdown(startMs && startMs > Date.now() ? startMs : null);
  const isLive    = myMatch.game_state === "IN_PROGRESS";
  const isWaiting = myMatch.game_state === "INITIALIZED" || myMatch.game_state === "WAITING";
  const canPlay   = isLive || isWaiting;

  return (
    <div className={styles.myMatchCard} style={{ "--match-color": accentColor } as React.CSSProperties}>
      <div className={styles.myMatchStripe} style={{ background: accentColor }} />
      <div className={styles.myMatchHeader}>
        <span className={styles.myMatchLabel}>Your Match</span>
        {isLive && <span className={styles.liveChip}><span className={styles.liveDot} />Live</span>}
        {isWaiting && countdown !== null && countdown > 0 && (
          <span className={styles.countdownChip}><Clock size={11} /> in {fmtCountdown(countdown)}</span>
        )}
        <span className={styles.myMatchMeta}>{myMatch.time_slot ?? ""}</span>
      </div>

      <div className={styles.matchup}>
        {[
          { player: me,  color: isWhite ? "white" : "black" },
          { player: opp, color: isWhite ? "black" : "white" },
        ].map(({ player, color }, idx) => (
          <div key={idx} className={styles.matchupPlayer}>
            <div className={styles.playerAvatar}>
              {player.img
                ? <img src={player.img} alt={player.username} />
                : <span>{(player.username ?? "?")[0]?.toUpperCase()}</span>}
            </div>
            <span className={styles.playerName}>{player.username}</span>
            <span className={styles.playerRating}>{player.rating}</span>
            <span className={styles.playerColorDot} data-color={color} />
          </div>
        ))}

        {/* vs divider between the two players */}
        <span className={styles.vsLabel}>vs</span>

        {canPlay && (
          <button
            type="button"
            className={styles.playMatchBtn}
            style={{ background: accentColor, color: "#1a0a00" }}
            onClick={() => onPlay(myMatch.gameId)}
          >
            {isLive ? "Resume" : "Play"} <ChevronRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TournamentDetail({ id }: Props) {
  const router = useRouter();
  const { user } = useAuth();

  const [tournament,     setTournament]     = useState<TournamentListItem | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [actionLoading,  setActionLoading]  = useState(false);
  const [playLoading,    setPlayLoading]    = useState(false);
  const [deleteConfirm,  setDeleteConfirm]  = useState(false);
  const [toast,          setToast]          = useState<{ msg: string; ok: boolean } | null>(null);
  const [activeTab,      setActiveTab]      = useState<Tab>("overview");

  // Track which tabs have been visited so lazy tabs only load once
  const [visitedTabs, setVisitedTabs] = useState<Set<Tab>>(new Set(["overview"]));

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    setVisitedTabs(prev => new Set([...prev, tab]));
  };

  useEffect(() => {
    setLoading(true);
    fetchTournament(id)
      .then(r => setTournament(r.data))
      .catch(() => setError("Tournament not found."))
      .finally(() => setLoading(false));
  }, [id]);

  const isActive      = tournament?.status === "IN_PROGRESS";
  const isParticipant = !!tournament?.userRole;
  const regClosed     = tournament
    ? new Date() > new Date(tournament.timeManagement.registrationCloseAt)
    : false;

  const accentColor = useMemo(() => {
    const cfg = TOURNAMENT_TYPE_CONFIGS.find(c => c.id === tournament?.tournamentType);
    return cfg?.color ?? "#f28b38";
  }, [tournament?.tournamentType]);

  const { liveData, loadingRounds, socketConnected, refresh } = useTournamentView(
    id, user?.id, isParticipant, isActive,
  );

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleJoin = async () => {
    setActionLoading(true);
    try {
      await joinTournament(id);
      showToast("Successfully joined!");
      const r = await fetchTournament(id);
      setTournament(r.data);
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? "Could not join tournament.", false);
    } finally { setActionLoading(false); }
  };

  const handleLeave = async () => {
    setActionLoading(true);
    try {
      await leaveTournament(id);
      showToast("Left tournament.");
      const r = await fetchTournament(id);
      setTournament(r.data);
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? "Could not leave.", false);
    } finally { setActionLoading(false); }
  };

  const handlePlay = async () => {
    setPlayLoading(true);
    try {
      const { gameId } = await fetchMyTournamentGame(id);
      if (gameId) router.push(`/arena/${gameId}`);
      else showToast("No active game right now — check back shortly.", false);
    } catch {
      showToast("Could not fetch your game. Please try again.", false);
    } finally { setPlayLoading(false); }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await deleteTournament(id);
      showToast("Tournament deleted.");
      setTimeout(() => router.push("/tournament"), 1200);
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? "Could not delete.", false);
    } finally { setActionLoading(false); setDeleteConfirm(false); }
  };

  // ── Loading / error states ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <RefreshCw size={22} className={styles.spin} />
          <span>Loading tournament…</span>
        </div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className={styles.page}>
        <div className={styles.errorState}>
          <p>{error ?? "Tournament not found."}</p>
          <button type="button" className={styles.backBtn} onClick={() => router.push("/tournament")}>
            <ArrowLeft size={14} /> Back
          </button>
        </div>
      </div>
    );
  }

  const t          = tournament;
  const typeConfig = TOURNAMENT_TYPE_CONFIGS.find(c => c.id === t.tournamentType);
  const statusInfo = STATUS_LABELS[t.status] ?? { label: t.status, cls: "draft" };
  const isJoined   = !!t.userRole;
  const canJoin    = !isJoined && t.status === "REGISTRATION_OPEN" && !regClosed;
  const isCreator  = !!user && t.creator.id === user.id;
  const canDelete  = isCreator && !["NOT_INITIALIZED","IN_PROGRESS"].includes(t.status);
  const fillPct    = t.maxPlayers ? Math.min(100, Math.round((t.participantCount / t.maxPlayers) * 100)) : null;

  function blockedReason(): string | null {
    if (isJoined) return null;
    if (regClosed && t.status === "REGISTRATION_OPEN") return "Registration window has closed.";
    if (t.status === "DRAFT")               return "Registration has not opened yet.";
    if (t.status === "REGISTRATION_CLOSED") return "Registration is closed.";
    if (t.status === "NOT_INITIALIZED")     return "Tournament is being prepared.";
    if (t.status === "IN_PROGRESS")         return "Tournament is already in progress.";
    if (t.status === "COMPLETED")           return "Tournament has ended.";
    if (t.status === "CANCELLED")           return "Tournament has been cancelled.";
    return null;
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>

      {/* Nav */}
      <div className={styles.nav}>
        <button type="button" className={styles.navBack} onClick={() => router.push("/tournament")}>
          <ArrowLeft size={15} /><span>All Tournaments</span>
        </button>
        {isActive && isParticipant && (
          <div className={styles.navRight}>
            <button type="button" className={styles.refreshBtn} onClick={refresh} title="Refresh standings">
              <RefreshCw size={13} />
            </button>
            <span className={socketConnected ? styles.connectedDot : styles.disconnectedDot}>
              {socketConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
              {socketConnected ? "Live" : "Offline"}
            </span>
          </div>
        )}
      </div>

      {/* Hero */}
      <div className={styles.hero} style={{ "--tc": accentColor } as React.CSSProperties}>
        <div className={styles.heroBg}
             style={{ background: `radial-gradient(ellipse at 60% 0%, ${accentColor}22 0%, transparent 65%)` }} />
        <div className={styles.heroContent}>
          <div className={styles.heroLeft}>
            <span className={styles.heroTypeIcon} style={{ color: accentColor }}>
              {typeConfig?.icon ?? <Swords size={28} />}
            </span>
            <div>
              <div className={styles.heroTypeLine}>
                <span className={`${styles.statusBadge} ${styles[`status_${statusInfo.cls}`]}`}>
                  {statusInfo.cls === "live" && <span className={styles.liveDot} />}
                  {statusInfo.label}
                </span>
                <span className={styles.typePill} style={{ color: accentColor, borderColor: `${accentColor}44` }}>
                  {typeConfig?.label ?? t.tournamentType}
                </span>
              </div>
              <h1 className={styles.heroTitle}>{t.name}</h1>
              {t.description && <p className={styles.heroDesc}>{t.description}</p>}
              <p className={styles.heroCreator}>by {t.creator.username}</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className={styles.heroActions}>
            {isJoined ? (
              <div className={styles.joinedBlock}>
                <span className={styles.joinedBadge}>✓ Registered</span>
                {t.status === "IN_PROGRESS" && (
                  <button type="button" className={styles.playBtn}
                          onClick={handlePlay} disabled={playLoading}>
                    {playLoading ? "Finding…" : "▶ Play"}
                  </button>
                )}
                {(t.status === "REGISTRATION_OPEN" || t.status === "DRAFT") && !regClosed && (
                  <button type="button" className={styles.leaveBtn}
                          onClick={handleLeave} disabled={actionLoading}>
                    {actionLoading ? "…" : "Leave"}
                  </button>
                )}
                {regClosed && t.status !== "IN_PROGRESS" && (
                  <span className={styles.joinBlocked}>Registration closed</span>
                )}
              </div>
            ) : canJoin ? (
              <button type="button" className={styles.joinBtn}
                      onClick={handleJoin} disabled={actionLoading}>
                {actionLoading ? "Joining…" : "Join Tournament"}
              </button>
            ) : (
              <div className={styles.joinedBlock}>
                {blockedReason() && <span className={styles.joinBlocked}>{blockedReason()}</span>}
                {(t.status === "IN_PROGRESS" || t.status === "COMPLETED") && (
                  <button type="button" className={styles.watchBtnLg}>Watch</button>
                )}
              </div>
            )}

            {canDelete && (
              <div className={styles.joinedBlock} style={{ marginTop: "0.75rem" }}>
                {deleteConfirm ? (
                  <>
                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Delete?</span>
                    <button type="button" className={styles.leaveBtn}
                            style={{ background: "#7a1e1e", borderColor: "#c0392b", color: "#f48771" }}
                            onClick={handleDelete} disabled={actionLoading}>
                      {actionLoading ? "…" : "Confirm"}
                    </button>
                    <button type="button" className={styles.leaveBtn}
                            onClick={() => setDeleteConfirm(false)} disabled={actionLoading}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <button type="button" className={styles.leaveBtn}
                          style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}
                          onClick={() => setDeleteConfirm(true)}>
                    <Trash2 size={13} /> Delete
                  </button>
                )}
              </div>
            )}
            {isCreator && (
              <div className={styles.joinedBlock} style={{ marginTop: "0.75rem" }}>
                <button type="button" className={styles.leaveBtn}
                        style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: "var(--surface-light)" }}
                        onClick={() => router.push(`/tournament/${id}/dashboard`)}>
                  <Settings size={13} /> Creator Dashboard
                </button>
              </div>
            )}
          </div>
        </div>

        {fillPct !== null && (
          <div className={styles.heroFillWrap}>
            <div className={styles.heroFillBar}>
              <div className={styles.heroFillProgress}
                   style={{ width: `${fillPct}%`, background: accentColor }} />
            </div>
            <span className={styles.heroFillLabel}>{t.participantCount}/{t.maxPlayers} players</span>
          </div>
        )}
      </div>

      {/* My Match card — only while live and I'm a participant */}
      {isActive && isParticipant && liveData?.myMatch && user?.id && (
        <div className={styles.myMatchWrap}>
          <MyMatchCard
            myMatch={liveData.myMatch}
            userId={user.id}
            accentColor={accentColor}
            onPlay={gameId => router.push(`/arena/${gameId}`)}
          />
        </div>
      )}

      {/* Tab bar */}
      <div className={styles.tabBar}>
        <button type="button"
                className={`${styles.tab} ${activeTab === "overview"  ? styles.tabActive : ""}`}
                style={activeTab === "overview" ? { borderBottomColor: accentColor, color: accentColor } : undefined}
                onClick={() => switchTab("overview")}>
          <Info size={14} /> Overview
        </button>
        <button type="button"
                className={`${styles.tab} ${activeTab === "rounds"    ? styles.tabActive : ""}`}
                style={activeTab === "rounds" ? { borderBottomColor: accentColor, color: accentColor } : undefined}
                onClick={() => switchTab("rounds")}>
          <LayoutList size={14} /> Rounds
        </button>
        <button type="button"
                className={`${styles.tab} ${activeTab === "standings" ? styles.tabActive : ""}`}
                style={activeTab === "standings" ? { borderBottomColor: accentColor, color: accentColor } : undefined}
                onClick={() => switchTab("standings")}>
          <BarChart2 size={14} /> Standings
        </button>
      </div>

      {/* Tab panes — all mounted but hidden so lazy components keep state */}
      <div className={styles.tabPane} hidden={activeTab !== "overview"}>
        <TournamentOverview tournament={t} accentColor={accentColor} />
      </div>

      <div className={styles.tabPane} hidden={activeTab !== "rounds"}>
        <TournamentRounds
          tournamentId={id}
          accentColor={accentColor}
          active={visitedTabs.has("rounds")}
          liveData={liveData}
          isLive={isActive}
          userId={user?.id}
        />
      </div>

      <div className={styles.tabPane} hidden={activeTab !== "standings"}>
        <TournamentStandings
          liveData={liveData}
          userId={user?.id}
          accentColor={accentColor}
          isActive={isActive}
        />
      </div>

      {toast && (
        <div className={`${styles.toast} ${toast.ok ? styles.toastOk : styles.toastErr}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
