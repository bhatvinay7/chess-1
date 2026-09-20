"use client";

import dynamic from "next/dynamic";
import AuthGuard, {
  AuthLoadingSplash,
} from "../../../components/auth/AuthGuard";

const SpectateRoute = dynamic(
  () => import("../../../components/chess/SpectateRoute"),
  {
    ssr: false,
    loading: () => <AuthLoadingSplash message="Joining spectator stream..." />,
  },
);

export default function SpectatePage() {
  return (
    <AuthGuard>
      <SpectateRoute />
    </AuthGuard>
  );
}
