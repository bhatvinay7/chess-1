"use client";

import dynamic from "next/dynamic";
import AuthGuard, {
  AuthLoadingSplash,
} from "../../../components/auth/AuthGuard";

const GameAnalysisRoute = dynamic(
  () => import("../../../components/analysis/GameAnalysisRoute"),
  {
    ssr: false,
    loading: () => <AuthLoadingSplash message="Loading game analysis..." />,
  },
);

export default function AnalysisRoutePage() {
  return (
    <AuthGuard>
      <GameAnalysisRoute />
    </AuthGuard>
  );
}
