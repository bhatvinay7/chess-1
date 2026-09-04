"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus,
  User,
  Mail,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import axio from "../../app/lib/axio";
import { getAdminToken, clearAdminToken } from "../../hooks/useAdminAuth";
import { useRouter } from "next/navigation";

type Status = "idle" | "loading" | "error" | "success";

export default function AdminCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  function handleLogout() {
    clearAdminToken();
    router.replace("/admin/login");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = getAdminToken();
    if (!token) {
      setStatus("error");
      setMessage(
        "You must be signed in as an admin to create accounts. Sign in first.",
      );
      return;
    }
    setStatus("loading");
    setMessage("");
    try {
      const res = await axio.post(
        "/auth/admin/create",
        { name, email },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setStatus("success");
      setMessage(`Admin created: @${res.data.username}`);
      setName("");
      setEmail("");
    } catch (err) {
      const axiosErr = err as {
        response?: { data?: { message?: string }; status?: number };
      };
      const isUnauthorized =
        axiosErr.response?.status === 401 || axiosErr.response?.status === 403;
      setStatus("error");
      setMessage(
        isUnauthorized
          ? "You must be signed in as an admin to create accounts. Sign in first."
          : (axiosErr.response?.data?.message ??
              "Failed to create admin. Please try again."),
      );
    }
  }

  return (
    <main className="adminPage flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-md"
      >
        {/* Brand tag */}
        <div className="flex justify-center mb-8">
          <span
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase"
            style={{
              background: "rgba(5,150,105,0.12)",
              color: "#059669",
              border: "1px solid rgba(5,150,105,0.25)",
            }}
          >
            <UserPlus size={13} />
            Admin · Create Account
          </span>
        </div>

        <div className="glass-panel p-5 sm:p-8 md:p-10">
          <h1 className="text-3xl font-extrabold mb-1 text-gradient">
            Add Administrator
          </h1>
          <p className="text-sm mb-8" style={{ color: "var(--muted)" }}>
            Create a new admin account. They will sign in using email OTP.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label
                className="flex items-center gap-2 text-sm font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                <User size={14} style={{ color: "#059669" }} />
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Alice Nakamura"
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-surface-border bg-white/60 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-300 outline-none transition-all text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                className="flex items-center gap-2 text-sm font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                <Mail size={14} style={{ color: "#059669" }} />
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                placeholder="alice@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-surface-border bg-white/60 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-300 outline-none transition-all text-sm"
              />
            </div>

            <AnimatePresence>
              {status === "error" && message && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
                >
                  <AlertCircle size={15} className="shrink-0" />
                  {message}
                </motion.div>
              )}
              {status === "success" && message && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm"
                >
                  <CheckCircle2 size={15} className="shrink-0" />
                  {message}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={status === "loading" || !name || !email}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: "#059669",
                boxShadow: "0 10px 24px rgba(5,150,105,0.25)",
              }}
            >
              {status === "loading" ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Creating…
                </>
              ) : (
                <>
                  <UserPlus size={18} /> Create Admin Account
                </>
              )}
            </button>
          </form>
        </div>

        <div
          className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs px-1"
          style={{ color: "var(--muted)" }}
        >
          <Link
            href="/admin/login"
            className="flex items-center gap-1 font-medium hover:text-primary transition-colors"
          >
            <ChevronLeft size={13} /> Sign In
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 font-medium hover:text-primary transition-colors"
          >
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </motion.div>
    </main>
  );
}
