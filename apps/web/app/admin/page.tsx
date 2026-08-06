"use client";

import dynamic from "next/dynamic";
import AuthGuard, { AuthLoadingSplash } from "../../components/auth/AuthGuard";

const AdminDashboard = dynamic(() => import("../../components/admin/AdminDashboard"), {
  ssr: false,
  loading: () => <AuthLoadingSplash message="Loading admin dashboard..." />,
});

export default function AdminPage() {
  return (
    <AuthGuard>
      <AdminDashboard />
    </AuthGuard>
  );
}
