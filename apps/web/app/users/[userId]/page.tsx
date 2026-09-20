"use client";

import dynamic from "next/dynamic";
import AuthGuard, {
  AuthLoadingSplash,
} from "../../../components/auth/AuthGuard";

const PublicUserProfilePage = dynamic(
  () => import("../../../components/social/PublicUserProfilePage"),
  {
    ssr: false,
    loading: () => <AuthLoadingSplash message="Loading user profile..." />,
  },
);

export default function UserProfileRoute() {
  return (
    <AuthGuard>
      <PublicUserProfilePage />
    </AuthGuard>
  );
}
