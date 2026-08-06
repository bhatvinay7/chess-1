"use client";

import dynamic from "next/dynamic";
import AuthGuard, { AuthLoadingSplash } from "../../components/auth/AuthGuard";

const GameHistory = dynamic(() => import("../../components/history/GameHistory"), {
  ssr: false,
  loading: () => <AuthLoadingSplash message="Loading match history..." />,
});

export default function HistoryRoute() {
  return (
    <AuthGuard>
      <GameHistory />
    </AuthGuard>
  );
}
