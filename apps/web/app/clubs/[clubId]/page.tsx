"use client";

import dynamic from "next/dynamic";
import AuthGuard, { AuthLoadingSplash } from "../../../components/auth/AuthGuard";

const ClubDetailPage = dynamic(() => import("../../../components/clubs/ClubDetailPage"), {
  ssr: false,
  loading: () => <AuthLoadingSplash message="Loading club details..." />,
});

export default function ClubDetailRoute() {
  return (
    <AuthGuard>
      <ClubDetailPage />
    </AuthGuard>
  );
}
