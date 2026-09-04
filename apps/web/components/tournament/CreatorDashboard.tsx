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
import dashboard from "./CreatorDashboard.module.css";

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
    <div className={dashboard.pageShell}>
      <div className={dashboard.topbar}>
        <button type="button" className={dashboard.backButton} onClick={() => router.push(`/tournament/${id}`)}>
          <ArrowLeft size={15} /><span>Back to Tournament</span>
        </button>
        <div>
          <button type="button" className={dashboard.refreshButton} onClick={refresh} title="Refresh data" aria-label="Refresh tournament data">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      <section className={dashboard.hero} style={{ "--tc": accentColor } as React.CSSProperties}>
          <div>
            <div className={dashboard.eyebrow}>Tournament administration</div>
            <h1 className={dashboard.title}>{tournament.name}</h1>
            <p className={dashboard.description}>Manage rounds, review games, and monitor standings.</p>
          </div>
          <div>
             {canTrigger && (
                <button 
                  type="button" 
                  className={dashboard.triggerButton}
                  onClick={handleTriggerRound} 
                  disabled={triggerLoading}
                >
                  <Zap size={15} style={{ marginRight: '5px', display: 'inline-block', verticalAlign: 'middle' }} />
                  {triggerLoading ? "Triggering…" : "Trigger Next Round"}
                </button>
             )}
          </div>
      </section>

      <main className={dashboard.content}>
        <section className={dashboard.section}>
        <div className={dashboard.sectionHeader}><h2 className={dashboard.sectionTitle}>Games and round status</h2><span className={dashboard.sectionHint}>Live tournament operations</span></div>
        <div className={dashboard.panel}>
          <TournamentRounds
            tournamentId={id}
            accentColor={accentColor}
            active={true}
            liveData={liveData}
            isLive={isActive}
            userId={user?.id}
          />
        </div>
        </section>

        <section className={dashboard.section}>
        <div className={dashboard.sectionHeader}><h2 className={dashboard.sectionTitle}>Scorecard and standings</h2><span className={dashboard.sectionHint}>Current ranking and scores</span></div>
        <div className={dashboard.panel}>
          <TournamentStandings
            liveData={liveData}
            userId={user?.id}
            accentColor={accentColor}
            isActive={isActive}
          />
        </div>
        </section>
      </main>

      {toast && (
        <div className={`${styles.toast} ${toast.ok ? styles.toastOk : styles.toastErr}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
