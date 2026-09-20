"use client";

import dynamic from "next/dynamic";
import AuthGuard, { AuthLoadingSplash } from "../../components/auth/AuthGuard";

const FriendsPage = dynamic(
  () => import("../../components/social/FriendsPage"),
  {
    ssr: false,
    loading: () => <AuthLoadingSplash message="Loading friends..." />,
  },
);

export default function FriendsRoute() {
  return (
    <AuthGuard>
      <FriendsPage />
    </AuthGuard>
  );
}
