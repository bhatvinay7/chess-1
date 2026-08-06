"use client";

import dynamic from "next/dynamic";
import AuthGuard, { AuthLoadingSplash } from "../../../components/auth/AuthGuard";

const BotGame = dynamic(() => import("../../../components/chess/BotGame"), {
  ssr: false,
  loading: () => <AuthLoadingSplash message="Loading bot arena..." />,
});

export default function BotGamePage() {
  return (
    <AuthGuard>
      <BotGame />
    </AuthGuard>
  );
}
