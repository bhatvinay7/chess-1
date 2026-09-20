"use client";

import dynamic from "next/dynamic";
import AuthGuard, {
  AuthLoadingSplash,
} from "../../../components/auth/AuthGuard";

const CoachPage = dynamic(
  () =>
    import("../../../components/chess/coach/CoachPage").then(
      (m) => m.CoachPage,
    ),
  {
    ssr: false,
    loading: () => <AuthLoadingSplash message="Loading coach mode..." />,
  },
);

export default function CoachRoutePage() {
  return (
    <AuthGuard>
      <CoachPage />
    </AuthGuard>
  );
}
