"use client";

import dynamic from "next/dynamic";
import AuthGuard, {
  AuthLoadingSplash,
} from "../../../components/auth/AuthGuard";

const InvitePage = dynamic(
  () => import("../../../components/invite/InvitePage"),
  {
    ssr: false,
    loading: () => (
      <AuthLoadingSplash message="Loading challenge settings..." />
    ),
  },
);

export default function InviteRoute() {
  return (
    <AuthGuard>
      <InvitePage />
    </AuthGuard>
  );
}
