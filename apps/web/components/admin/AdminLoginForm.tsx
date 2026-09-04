"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogIn,
  Mail,
  KeyRound,
  Loader2,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import axio from "../../app/lib/axio";
import { setAdminToken } from "../../hooks/useAdminAuth";

type Step = "email" | "otp";
type Status = "idle" | "loading" | "error" | "success";

function AdminLoginInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const from = searchParams.get("from") ?? "/admin";

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function startCountdown() {
    setCountdown(60);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      await axio.post("/auth/admin/request-otp", { email });
      setStep("otp");
      setStatus("idle");
      startCountdown();
    } catch (err) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setStatus("error");
      setMessage(
        axiosErr.response?.data?.message ??
          "Failed to send OTP. Please try again.",
      );
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const res = await axio.post("/auth/admin/verify-otp", { email, otp });
      setAdminToken(res.data.token);
      setStatus("success");
      setMessage("Signed in successfully.");
      setTimeout(() => router.replace(from), 800);
    } catch (err) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setStatus("error");
      setMessage(axiosErr.response?.data?.message ?? "Invalid or expired OTP.");
    }
  }

  async function handleResend() {
    if (countdown > 0) return;
    setStatus("loading");
    setMessage("");
    try {
      await axio.post("/auth/admin/request-otp", { email });
      setStatus("idle");
      setOtp("");
      startCountdown();
    } catch (err) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setStatus("error");
      setMessage(axiosErr.response?.data?.message ?? "Failed to resend OTP.");
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
              background: "rgba(59,130,246,0.12)",
              color: "#2563eb",
              border: "1px solid rgba(59,130,246,0.25)",
            }}
          >
            <LogIn size={13} />
            Admin · Sign In
          </span>
        </div>

        <div className="glass-panel p-5 sm:p-8 md:p-10">
          <h1 className="text-3xl font-extrabold mb-1 text-gradient">
            Welcome Back
          </h1>
          <p className="text-sm mb-8" style={{ color: "var(--muted)" }}>
            Enter your admin email to receive a sign-in code.
          </p>

          <AnimatePresence mode="wait">
            {step === "email" ? (
              <motion.form
                key="email-step"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                onSubmit={handleRequestOtp}
                className="flex flex-col gap-5"
              >
                <div className="flex flex-col gap-1.5">
                  <label
                    className="flex items-center gap-2 text-sm font-semibold"
                    style={{ color: "var(--foreground)" }}
                  >
                    <Mail size={14} style={{ color: "#2563eb" }} />
                    Admin Email
                  </label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-surface-border bg-white/60 focus:border-blue-400 focus:ring-1 focus:ring-blue-300 outline-none transition-all text-sm"
                  />
                </div>

                <StatusMessage status={status} message={message} />

                <button
                  type="submit"
                  disabled={status === "loading" || !email}
                  className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{
                    background: "#2563eb",
                    boxShadow: "0 10px 24px rgba(37,99,235,0.25)",
                  }}
                >
                  {status === "loading" ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Sending…
                    </>
                  ) : (
                    <>
                      <Mail size={18} /> Send Sign-In Code
                    </>
                  )}
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="otp-step"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                onSubmit={handleVerifyOtp}
                className="flex flex-col gap-5"
              >
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setStatus("idle");
                    setMessage("");
                    setOtp("");
                  }}
                  className="flex items-center gap-1.5 text-xs font-medium w-fit"
                  style={{ color: "var(--muted)" }}
                >
                  <ArrowLeft size={13} /> Change email
                </button>

                <div className="flex flex-col gap-1.5">
                  <label
                    className="flex items-center gap-2 text-sm font-semibold"
                    style={{ color: "var(--foreground)" }}
                  >
                    <KeyRound size={14} style={{ color: "#2563eb" }} />
                    6-Digit Code
                  </label>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>
                    Sent to <span className="font-semibold">{email}</span>
                  </p>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    required
                    autoFocus
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    className="w-full px-4 py-3 rounded-lg border border-surface-border bg-white/60 focus:border-blue-400 focus:ring-1 focus:ring-blue-300 outline-none transition-all text-sm font-mono tracking-widest"
                  />
                </div>

                <StatusMessage status={status} message={message} />

                <button
                  type="submit"
                  disabled={status === "loading" || otp.length !== 6}
                  className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{
                    background: "#2563eb",
                    boxShadow: "0 10px 24px rgba(37,99,235,0.25)",
                  }}
                >
                  {status === "loading" ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Verifying…
                    </>
                  ) : (
                    <>
                      <LogIn size={18} /> Sign In
                    </>
                  )}
                </button>

                <div
                  className="text-center text-xs"
                  style={{ color: "var(--muted)" }}
                >
                  Didn&apos;t receive a code?{" "}
                  {countdown > 0 ? (
                    <span className="font-semibold">
                      Resend in {countdown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      className="font-semibold underline underline-offset-2"
                      style={{ color: "#2563eb" }}
                    >
                      Resend
                    </button>
                  )}
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        <p
          className="mt-6 text-center text-xs"
          style={{ color: "var(--muted)" }}
        >
          Need to add an admin?{" "}
          <Link
            href="/admin/create"
            className="font-semibold"
            style={{ color: "#2563eb" }}
          >
            Create an account →
          </Link>
        </p>
      </motion.div>
    </main>
  );
}

function StatusMessage({
  status,
  message,
}: {
  status: Status;
  message: string;
}) {
  return (
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
  );
}

export default function AdminLoginForm() {
  return (
    <Suspense
      fallback={
        <main className="adminPage flex items-center justify-center">
          <Loader2
            size={32}
            className="animate-spin"
            style={{ color: "#2563eb" }}
          />
        </main>
      }
    >
      <AdminLoginInner />
    </Suspense>
  );
}
