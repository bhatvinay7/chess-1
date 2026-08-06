"use client";

import dynamic from "next/dynamic";
import AuthGuard, { AuthLoadingSplash } from "../../components/auth/AuthGuard";

const WatchPage = dynamic(() => import("../../components/watch/WatchPage"), {
  ssr: false,
  loading: () => <AuthLoadingSplash message="Loading live games..." />,
});

export default function WatchRoute() {
  return (
    <AuthGuard>
      <WatchPage />
    </AuthGuard>
  );
}
