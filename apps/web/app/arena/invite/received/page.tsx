"use client";

import dynamic from "next/dynamic";
import AuthGuard, {
  AuthLoadingSplash,
} from "../../../../components/auth/AuthGuard";

const ReceivedInvitesPage = dynamic(
  () => import("../../../../components/invite/ReceivedInvitesPage"),
  {
    ssr: false,
    loading: () => <AuthLoadingSplash message="Loading your invitations..." />,
  },
);

export default function ReceivedInvitesRoute() {
  return (
    <AuthGuard>
      <ReceivedInvitesPage />
    </AuthGuard>
  );
}
