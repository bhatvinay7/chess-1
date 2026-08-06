"use client";

import dynamic from "next/dynamic";
import AuthGuard, { AuthLoadingSplash } from "../../components/auth/AuthGuard";

const ArenaChessBoard = dynamic(() => import("../../components/chess/ChessBoard"), {
  ssr: false,
  loading: () => <AuthLoadingSplash message="Entering arena..." />,
});

export default function ArenaPage() {
  return (
    <AuthGuard>
      <ArenaChessBoard />
    </AuthGuard>
  );
}
