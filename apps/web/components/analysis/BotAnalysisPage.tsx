"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnalysisPage } from "./AnalysisPage";
import type { GameDetail } from "../../app/lib/api/analysis";
import { Loader2 } from "lucide-react";
import styles from "./BotAnalysisPage.module.css";

export default function BotAnalysisPage() {
  const router = useRouter();
  const [game, setGame] = useState<GameDetail | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const pgn = localStorage.getItem("rooky_bot_pgn");
    const color = (localStorage.getItem("rooky_bot_color") ?? "white") as
      | "white"
      | "black";
    if (!pgn) {
      setError(true);
      return;
    }

    const mockGame: GameDetail = {
      id: "bot-game",
      pgn,
      currentFen: "",
      initialFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      timeControl: "Bot Game",
      gameName: "vs Bot",
      isRated: false,
      status: "COMPLETED",
      result: "WIN",
      playerColor: color,
      moveCount: 0,
      startedAt: null,
      endedAt: null,
      whitePlayer: {
        id: "player",
        username: "You",
        profileImageUrl: null,
        rating: null,
        ratingAfter: null,
      },
      blackPlayer: {
        id: "bot",
        username: "Bot",
        profileImageUrl: null,
        rating: null,
        ratingAfter: null,
      },
      gameMode: "standard",
      analysis: null,
    };

    setGame(mockGame);
  }, []);

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <span>No bot game found. Play a game first.</span>
        <button
          onClick={() => router.push("/arena/bot")}
          className={styles.playBtn}
        >
          Play vs Bot
        </button>
      </div>
    );
  }

  if (!game) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 size={20} style={{ animation: "spin 0.7s linear infinite" }} />
        <span>Loading analysis…</span>
      </div>
    );
  }

  return <AnalysisPage game={game} skipBackend />;
}
