"use client";

import dynamic from "next/dynamic";
import AuthGuard, { AuthLoadingSplash } from "../../components/auth/AuthGuard";

const UploadPage = dynamic(() => import("../../components/upload/UploadPage"), {
  ssr: false,
  loading: () => <AuthLoadingSplash message="Loading media studio..." />,
});

export default function UploadRoute() {
  return (
    <AuthGuard>
      <UploadPage />
    </AuthGuard>
  );
}
