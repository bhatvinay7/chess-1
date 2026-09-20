"use client";

import dynamic from "next/dynamic";
import AuthGuard, { AuthLoadingSplash } from "../../components/auth/AuthGuard";

const ProfileCard = dynamic(
  () => import("../../components/profile/ProfileCard"),
  {
    ssr: false,
    loading: () => <AuthLoadingSplash message="Loading profile..." />,
  },
);

export default function ProfileRoute() {
  return (
    <AuthGuard>
      <ProfileCard />
    </AuthGuard>
  );
}
