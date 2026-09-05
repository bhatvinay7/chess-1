"use client";

import dynamic from "next/dynamic";
import AuthGuard, { AuthLoadingSplash } from "../../../../components/auth/AuthGuard";

const CreatorDashboard = dynamic(() => import("../../../../components/tournament/CreatorDashboard"), {
  ssr: false,
  loading: () => <AuthLoadingSplash message="Loading creator dashboard..." />,
});

export default function CreatorDashboardPage() {
  return (
    <AuthGuard>
      <CreatorDashboard />
    </AuthGuard>
  );
}
