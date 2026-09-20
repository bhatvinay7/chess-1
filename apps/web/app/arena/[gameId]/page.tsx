"use client";

import dynamic from "next/dynamic";
import AuthGuard, {
  AuthLoadingSplash,
} from "../../../components/auth/AuthGuard";

const GameRoute = dynamic(() => import("../../../components/chess/GameRoute"), {
  ssr: false,
  loading: () => <AuthLoadingSplash message="Loading game..." />,
});

export default function GameRoutePage() {
  return (
    <AuthGuard>
      <GameRoute />
    </AuthGuard>
  );
}
