"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, Zap } from "lucide-react";
import type { TournamentListItem } from "./types";
import {
  fetchTournament,
  fetchTournamentRounds,
  triggerManualRound,
  TournamentRoundDetail
} from "../../app/lib/api/tournaments";
import { useAuth } from "../../hooks/useAuth";
import { TOURNAMENT_TYPE_CONFIGS } from "./TournamentTypesSidebar";
import TournamentOverview from "./TournamentOverview";
import TournamentRounds from "./TournamentRounds";
import TournamentStandings from "./TournamentStandings";
import { useTournamentView } from "../../hooks/useTournamentView";

import styles from "./TournamentDetail.module.css";

interface Props { id: string }

export default function CreatorDashboard({ id }: Props) {
  const router = useRouter();
  const { user } = useAuth();

  const [tournament, setTournament] = useState<TournamentListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Reusing existing hook to fetch live socket data
  const isActive = tournament?.status === "IN_PROGRESS";
  const { liveData, refresh } = useTournamentView(id, user?.id, true, isActive);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    setLoading(true);
    fetchTournament(id)
      .then(r => setTournament(r.data))
      .catch(() => setError("Tournament not found."))
      .finally(() => setLoading(false));
  }, [id]);

  const isCreator = !!user && tournament?.creator.id === user.id;

  const handleTriggerRound = async () => {
    setTriggerLoading(true);
    try {
      await triggerManualRound(id);
      showToast("Manual trigger sent! Round generation initiated.");
      refresh();
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? "Could not trigger round.", false);
    } finally {
      setTriggerLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <RefreshCw size={22} className={styles.spin} />
          <span>Loading dashboard…</span>
        </div>
      </div>
    );
  }

  if (error || !tournament || !isCreator) {
    return (
      <div className={styles.page}>
        <div className={styles.errorState}>
          <p>{error ?? "Not authorized or tournament not found."}</p>
          <button type="button" className={styles.backBtn} onClick={() => router.push(`/tournament/${id}`)}>
            <ArrowLeft size={14} /> Back to Tournament
          </button>
        </div>
      </div>
    );
  }

  const accentColor = TOURNAMENT_TYPE_CONFIGS.find(c => c.id === tournament.tournamentType)?.color ?? "#f28b38";

  // Check if we can trigger the next round
  // Enable if tournament is IN_PROGRESS and no round is IN_PROGRESS (so previous round is COMPLETED)
  // Or if it's NOT_INITIALIZED / REGISTRATION_CLOSED and we want to start it
  const canTrigger = ["REGISTRATION_CLOSED", "NOT_INITIALIZED", "IN_PROGRESS"].includes(tournament.status);

  return (
    <div className={styles.page}>
      <div className={styles.nav}>
        <button type="button" className={styles.navBack} onClick={() => router.push(`/tournament/${id}`)}>
          <ArrowLeft size={15} /><span>Back to Tournament</span>
        </button>
        <div className={styles.navRight}>
          <button type="button" className={styles.refreshBtn} onClick={refresh} title="Refresh data">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      <div className={styles.hero} style={{ "--tc": accentColor } as React.CSSProperties}>
        <div className={styles.heroBg}
             style={{ background: `radial-gradient(ellipse at 60% 0%, ${accentColor}22 0%, transparent 65%)` }} />
        <div className={styles.heroContent}>
          <div className={styles.heroLeft}>
            <div>
              <div className={styles.heroTypeLine}>
                <span className={`${styles.statusBadge} ${styles.status_live}`}>
                  Creator Dashboard
                </span>
              </div>
              <h1 className={styles.heroTitle}>{tournament.name}</h1>
              <p className={styles.heroDesc}>Manage and monitor your tournament here.</p>
            </div>
          </div>
          <div className={styles.heroActions}>
             {canTrigger && (
                <button 
                  type="button" 
                  className={styles.joinBtn} 
                  style={{ background: accentColor, color: '#111' }}
                  onClick={handleTriggerRound} 
                  disabled={triggerLoading}
                >
                  <Zap size={15} style={{ marginRight: '5px', display: 'inline-block', verticalAlign: 'middle' }} />
                  {triggerLoading ? "Triggering…" : "Trigger Next Round"}
                </button>
             )}
          </div>
        </div>
      </div>

      <div style={{ padding: '0 2rem 2rem' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', marginTop: '2rem' }}>All Games & Rounds Status</h2>
        <div style={{ background: 'var(--surface-light)', borderRadius: '12px', overflow: 'hidden' }}>
          <TournamentRounds
            tournamentId={id}
            accentColor={accentColor}
            active={true}
            liveData={liveData}
            isLive={isActive}
            userId={user?.id}
          />
        </div>

        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', marginTop: '2rem' }}>Scorecard / Standings</h2>
        <div style={{ background: 'var(--surface-light)', borderRadius: '12px', overflow: 'hidden' }}>
          <TournamentStandings
            liveData={liveData}
            userId={user?.id}
            accentColor={accentColor}
            isActive={isActive}
          />
        </div>
      </div>

      {toast && (
        <div className={`${styles.toast} ${toast.ok ? styles.toastOk : styles.toastErr}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
