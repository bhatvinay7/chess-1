"use client";

import dynamic from "next/dynamic";
import AuthGuard, { AuthLoadingSplash } from "../../components/auth/AuthGuard";

const SettingsPage = dynamic(
  () =>
    import("../../components/settings/SettingsPage").then(
      (m) => m.SettingsPage,
    ),
  {
    ssr: false,
    loading: () => <AuthLoadingSplash message="Loading settings..." />,
  },
);

export default function SettingsRoute() {
  return (
    <AuthGuard>
      <SettingsPage />
    </AuthGuard>
  );
}
