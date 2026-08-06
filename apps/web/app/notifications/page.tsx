"use client";

import dynamic from "next/dynamic";
import AuthGuard, { AuthLoadingSplash } from "../../components/auth/AuthGuard";

const NotificationsPage = dynamic(() => import("../../components/notifications/NotificationsPage"), {
  ssr: false,
  loading: () => <AuthLoadingSplash message="Loading notifications..." />,
});

export default function NotificationsRoute() {
  return (
    <AuthGuard>
      <NotificationsPage />
    </AuthGuard>
  );
}
