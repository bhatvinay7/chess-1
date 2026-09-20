"use client";

import dynamic from "next/dynamic";
import AuthGuard, {
  AuthLoadingSplash,
} from "../../../components/auth/AuthGuard";

const TournamentDetailRoute = dynamic(
  () => import("../../../components/tournament/TournamentDetailRoute"),
  {
    ssr: false,
    loading: () => (
      <AuthLoadingSplash message="Loading tournament details..." />
    ),
  },
);

export default function TournamentDetailRoutePage() {
  return (
    <AuthGuard>
      <TournamentDetailRoute />
    </AuthGuard>
  );
}
