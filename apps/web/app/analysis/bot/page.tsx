"use client";

import dynamic from "next/dynamic";
import AuthGuard, { AuthLoadingSplash } from "../../../components/auth/AuthGuard";

const BotAnalysisPage = dynamic(() => import("../../../components/analysis/BotAnalysisPage"), {
  ssr: false,
  loading: () => <AuthLoadingSplash message="Loading analysis..." />,
});

export default function BotAnalysisRoute() {
  return (
    <AuthGuard>
      <BotAnalysisPage />
    </AuthGuard>
  );
}
