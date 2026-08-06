"use client";

import dynamic from "next/dynamic";
import AuthGuard, { AuthLoadingSplash } from "../../components/auth/AuthGuard";

const ClubsPage = dynamic(() => import("../../components/clubs/ClubsPage"), {
  ssr: false,
  loading: () => <AuthLoadingSplash message="Loading clubs..." />,
});

export default function ClubsRoute() {
  return (
    <AuthGuard>
      <ClubsPage />
    </AuthGuard>
  );
}
