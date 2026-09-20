"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getGameDetail, type GameDetail } from "../../app/lib/api/analysis";
import { AnalysisPage } from "./AnalysisPage";
import { Loader2 } from "lucide-react";
import styles from "./GameAnalysisRoute.module.css";

export default function GameAnalysisRoute() {
  const params = useParams();
  const router = useRouter();
  const gameId = params?.gameId as string;

  const [game, setGame] = useState<GameDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) return;
    getGameDetail(gameId)
      .then(setGame)
      .catch(() =>
        setError(
          "Could not load game. It may not exist or you may not have access.",
        ),
      );
  }, [gameId]);

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <span>{error}</span>
        <button
          onClick={() => router.push("/history")}
          className={styles.backButton}
        >
          Back to History
        </button>
      </div>
    );
  }

  if (!game) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 size={20} className={styles.spinner} />
        <span>Loading game…</span>
      </div>
    );
  }

  return <AnalysisPage game={game} />;
}
