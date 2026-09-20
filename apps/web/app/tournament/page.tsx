"use client";

import dynamic from "next/dynamic";
import AuthGuard, { AuthLoadingSplash } from "../../components/auth/AuthGuard";

const TournamentPage = dynamic(
  () => import("../../components/tournament/TournamentPage"),
  {
    ssr: false,
    loading: () => <AuthLoadingSplash message="Loading tournaments..." />,
  },
);

export default function TournamentRoute() {
  return (
    <AuthGuard>
      <TournamentPage />
    </AuthGuard>
  );
}
