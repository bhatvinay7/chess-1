"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { authApi } from "../../app/api/auth/auth";
import { setUserSession } from "../../hooks/useAuth";
import { AuthLanding } from "./AuthLanding";
import { AuthEmailForm } from "./AuthEmailForm";

interface AuthFormProps {
  type: "login" | "signup";
}

type Step =
  | "landing"
  | "email"
  | "otp"
  | "forgot-email"
  | "forgot-otp"
  | "forgot-reset"
  | "forgot-done";

type Status = "idle" | "loading" | "error" | "success";

const RESEND_COOLDOWN = 60;

export default function AuthForm({ type }: AuthFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(type === "signup" ? "landing" : "email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");

  const otpRef = useRef<HTMLInputElement>(null);
  const forgotOtpRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (step === "otp") otpRef.current?.focus();
    if (step === "forgot-otp") forgotOtpRef.current?.focus();
  }, [step]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN);
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const setErr = (msg: string) => { setStatus("error"); setErrorMsg(msg); };

  /* ── Login with email + password ── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    try {
      const data = await authApi.loginWithPassword(email, password);
      setUserSession(data.token, data.user);
      setStatus("success");
      router.replace("/");
    } catch (err) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setErr(axiosErr.response?.data?.message || "Invalid email or password.");
    }
  };

  /* ── Signup: send OTP ── */
  const handleSignupSendOtp = async (emailVal: string, pw: string, usernameVal?: string) => {
    setEmail(emailVal);
    setPassword(pw);
    if (usernameVal) setUsername(usernameVal);
    setStatus("loading");
    setErrorMsg("");
    try {
      await authApi.requestOtp(emailVal);
      setStep("otp");
      setStatus("idle");
      startCooldown();
    } catch (err) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setErr(axiosErr.response?.data?.message || "Failed to send verification code.");
    }
  };

  /* ── Signup: verify OTP ── */
  const handleSignupVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) { setErr("Enter the 6-digit code from your email."); return; }
    setStatus("loading");
    setErrorMsg("");
    try {
      const data = await authApi.signupVerifyOtp(email, otp, username, password);
      setUserSession(data.token, data.user);
      setStatus("success");
      router.replace("/");
    } catch (err) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setErr(axiosErr.response?.data?.message || "Verification failed. Please try again.");
    }
  };

  const handleResendSignup = async () => {
    if (cooldown > 0) return;
    setStatus("loading"); setErrorMsg(""); setOtp("");
    try {
      await authApi.requestOtp(email);
      setStatus("idle");
      startCooldown();
    } catch (err) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setErr(axiosErr.response?.data?.message || "Failed to resend code.");
    }
  };

  /* ── Forgot password: request OTP ── */
  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading"); setErrorMsg("");
    try {
      await authApi.requestPasswordReset(forgotEmail);
      setStep("forgot-otp");
      setStatus("idle");
      startCooldown();
    } catch (err) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setErr(axiosErr.response?.data?.message || "Failed to send reset code.");
    }
  };

  /* ── Forgot password: reset ── */
  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotOtp.length !== 6) { setErr("Enter the 6-digit code from your email."); return; }
    if (newPassword.length < 6) { setErr("Password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { setErr("Passwords do not match."); return; }
    setStatus("loading"); setErrorMsg("");
    try {
      await authApi.resetPassword(forgotEmail, forgotOtp, newPassword);
      setStep("forgot-done");
      setStatus("idle");
    } catch (err) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setErr(axiosErr.response?.data?.message || "Reset failed. Try again.");
    }
  };

  const slideIn = { initial: { opacity: 0, x: 16 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -16 }, transition: { duration: 0.2 } };

  return (
    <div style={pageStyles.page}>
      <div style={pageStyles.bgPattern} aria-hidden="true" />
      <div style={pageStyles.card}>
        <AnimatePresence mode="wait">

          {/* ── Signup Landing ── */}
          {step === "landing" && (
            <motion.div key="landing" {...slideIn}>
              <AuthLanding mode="signup" onContinueWithEmail={() => setStep("email")} />
            </motion.div>
          )}

          {/* ── Signup Email/Password Form ── */}
          {step === "email" && type === "signup" && (
            <motion.div key="email-signup" {...slideIn}>
              <AuthEmailForm
                showUsername
                title="Create Your Account"
                subtitle="Enter your details to get started"
                submitLabel="Send Verification Code"
                isLoading={status === "loading"}
                error={status === "error" ? errorMsg : undefined}
                onBack={() => { setStep("landing"); setStatus("idle"); setErrorMsg(""); }}
                onSubmit={handleSignupSendOtp}
              />
            </motion.div>
          )}

          {/* ── Signup OTP Verify ── */}
          {step === "otp" && type === "signup" && (
            <motion.div key="otp-signup" {...slideIn}>
              <OtpStep
                email={email}
                otp={otp}
                status={status}
                errorMsg={errorMsg}
                cooldown={cooldown}
                otpRef={otpRef}
                heading="Verify your email"
                subheading="We sent a 6-digit code to"
                submitLabel="Verify & Create Account"
                onOtpChange={(v) => { setOtp(v); if (status === "error") setStatus("idle"); }}
                onSubmit={handleSignupVerify}
                onResend={handleResendSignup}
                onBack={() => { setStep("email"); setStatus("idle"); setOtp(""); setErrorMsg(""); }}
              />
            </motion.div>
          )}

          {/* ── Login ── */}
          {step === "email" && type === "login" && (
            <motion.div key="email-login" {...slideIn}>
              <div style={cardStyles.header}>
                <Logo />
              </div>
              <form onSubmit={handleLogin} style={cardStyles.form}>
                <InputField
                  icon={<Mail size={15} />}
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={setEmail}
                  autoComplete="email"
                  required
                />
                <div style={cardStyles.inputWrap}>
                  <span style={cardStyles.inputIcon}><Lock size={15} /></span>
                  <input
                    type={showPw ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    style={{ ...cardStyles.input, paddingRight: "2.6rem" }}
                  />
                  <button type="button" onClick={() => setShowPw((v) => !v)} style={cardStyles.eyeBtn} tabIndex={-1}>
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>

                <div style={cardStyles.rememberRow}>
                  <label style={cardStyles.rememberLabel}>
                    <input type="checkbox" style={{ accentColor: "#81b64c" }} />
                    Remember me
                  </label>
                  <button
                    type="button"
                    style={cardStyles.forgotBtn}
                    onClick={() => { setForgotEmail(email); setStep("forgot-email"); setStatus("idle"); setErrorMsg(""); }}
                  >
                    Forgot Password?
                  </button>
                </div>

                <ErrorBox status={status} errorMsg={errorMsg} />

                <PrimaryBtn disabled={status === "loading"}>
                  {status === "loading"
                    ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Signing in…</>
                    : <>Log In <ArrowRight size={15} /></>}
                </PrimaryBtn>

                <p style={cardStyles.footerText}>
                  New?{" "}
                  <Link href="/auth/signup" style={cardStyles.footerLink}>
                    Sign up — and start playing chess!
                  </Link>
                </p>
              </form>
            </motion.div>
          )}

          {/* ── Forgot: enter email ── */}
          {step === "forgot-email" && (
            <motion.div key="forgot-email" {...slideIn}>
              <div style={cardStyles.header}>
                <Logo />
                <h1 style={cardStyles.heading}>Reset Password</h1>
                <p style={cardStyles.subheading}>Enter your email to receive a reset code</p>
              </div>
              <form onSubmit={handleForgotRequest} style={cardStyles.form}>
                <InputField
                  icon={<Mail size={15} />}
                  type="email"
                  placeholder="Email"
                  value={forgotEmail}
                  onChange={setForgotEmail}
                  autoComplete="email"
                  required
                />
                <ErrorBox status={status} errorMsg={errorMsg} />
                <PrimaryBtn disabled={status === "loading"}>
                  {status === "loading"
                    ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Sending…</>
                    : "Send Reset Code"}
                </PrimaryBtn>
                <button
                  type="button"
                  onClick={() => { setStep("email"); setStatus("idle"); setErrorMsg(""); }}
                  style={cardStyles.backLink}
                >
                  ← Back to login
                </button>
              </form>
            </motion.div>
          )}

          {/* ── Forgot: OTP + new password ── */}
          {step === "forgot-otp" && (
            <motion.div key="forgot-otp" {...slideIn}>
              <div style={cardStyles.header}>
                <Logo />
                <h1 style={cardStyles.heading}>Set New Password</h1>
                <p style={cardStyles.subheading}>We sent a code to</p>
                <p style={{ color: "#81b64c", fontWeight: 700, fontSize: "0.9rem", textAlign: "center", margin: 0 }}>
                  {forgotEmail}
                </p>
              </div>
              <form onSubmit={handleForgotReset} style={cardStyles.form}>
                <input
                  ref={forgotOtpRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="000000"
                  value={forgotOtp}
                  onChange={(e) => { setForgotOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); if (status === "error") setStatus("idle"); }}
                  required
                  style={cardStyles.otpInput}
                />
                <div style={cardStyles.inputWrap}>
                  <span style={cardStyles.inputIcon}><Lock size={15} /></span>
                  <input
                    type={showNewPw ? "text" : "password"}
                    placeholder="New password (min 6 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    style={{ ...cardStyles.input, paddingRight: "2.6rem" }}
                  />
                  <button type="button" onClick={() => setShowNewPw((v) => !v)} style={cardStyles.eyeBtn} tabIndex={-1}>
                    {showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <InputField
                  icon={<Lock size={15} />}
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  autoComplete="new-password"
                  required
                />

                <ErrorBox status={status} errorMsg={errorMsg} />

                <PrimaryBtn disabled={status === "loading" || forgotOtp.length !== 6}>
                  {status === "loading"
                    ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Resetting…</>
                    : "Reset Password"}
                </PrimaryBtn>

                <div style={{ textAlign: "center", fontSize: "0.84rem", color: "var(--text-muted)" }}>
                  {cooldown > 0 ? (
                    <span>Resend in {cooldown}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        setStatus("loading");
                        try {
                          await authApi.requestPasswordReset(forgotEmail);
                          setStatus("idle");
                          startCooldown();
                        } catch { setErr("Failed to resend."); }
                      }}
                      style={cardStyles.resendBtn}
                    >
                      <RotateCcw size={13} /> Resend code
                    </button>
                  )}
                </div>

                <button type="button" onClick={() => { setStep("forgot-email"); setStatus("idle"); setForgotOtp(""); setErrorMsg(""); }} style={cardStyles.backLink}>
                  ← Change email
                </button>
              </form>
            </motion.div>
          )}

          {/* ── Forgot: success ── */}
          {step === "forgot-done" && (
            <motion.div key="forgot-done" {...slideIn}>
              <div style={{ ...cardStyles.header, gap: "1rem" }}>
                <Logo />
                <CheckCircle2 size={48} color="#81b64c" />
                <h1 style={cardStyles.heading}>Password Reset!</h1>
                <p style={cardStyles.subheading}>Your password has been updated. You can now log in.</p>
              </div>
              <PrimaryBtn onClick={() => { setStep("email"); setStatus("idle"); setErrorMsg(""); setForgotOtp(""); setNewPassword(""); setConfirmPassword(""); }}>
                Go to Login
              </PrimaryBtn>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── Shared sub-components ── */

function Logo() {
  return (
    <div style={cardStyles.logo}>
      <span style={cardStyles.logoPawn}>♟</span>
      <span style={cardStyles.logoWord}>Rooky</span>
      <span style={cardStyles.logoDot}>.com</span>
    </div>
  );
}

function InputField({
  icon, type, placeholder, value, onChange, autoComplete, required,
}: {
  icon: React.ReactNode;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div style={cardStyles.inputWrap}>
      <span style={cardStyles.inputIcon}>{icon}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        style={cardStyles.input}
      />
    </div>
  );
}

function ErrorBox({ status, errorMsg }: { status: string; errorMsg: string }) {
  return (
    <AnimatePresence>
      {status === "error" && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={cardStyles.errorBox}>
          <AlertCircle size={14} />
          {errorMsg}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PrimaryBtn({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick?: () => void }) {
  return (
    <button
      type={onClick ? "button" : "submit"}
      disabled={disabled}
      onClick={onClick}
      style={cardStyles.primaryBtn}
      onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.filter = "brightness(1.1)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = "brightness(1)"; }}
    >
      {children}
    </button>
  );
}

function OtpStep({
  email, otp, status, errorMsg, cooldown, otpRef, heading, subheading, submitLabel,
  onOtpChange, onSubmit, onResend, onBack,
}: {
  email: string; otp: string; status: Status; errorMsg: string; cooldown: number;
  otpRef: React.RefObject<HTMLInputElement | null>; heading: string; subheading: string; submitLabel: string;
  onOtpChange: (v: string) => void; onSubmit: (e: React.FormEvent) => void;
  onResend: () => void; onBack: () => void;
}) {
  return (
    <>
      <div style={cardStyles.header}>
        <Logo />
        <h1 style={cardStyles.heading}>{heading}</h1>
        <p style={cardStyles.subheading}>{subheading}</p>
        <p style={{ color: "#81b64c", fontWeight: 700, fontSize: "0.9rem", textAlign: "center", margin: 0 }}>{email}</p>
      </div>
      <form onSubmit={onSubmit} style={cardStyles.form}>
        <input
          ref={otpRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          placeholder="000000"
          value={otp}
          onChange={(e) => onOtpChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
          required
          style={cardStyles.otpInput}
        />
        <AnimatePresence>
          {status === "error" && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={cardStyles.errorBox}>
              <AlertCircle size={14} /> {errorMsg}
            </motion.div>
          )}
          {status === "success" && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} style={{ ...cardStyles.errorBox, background: "rgba(80,200,80,0.1)", border: "1px solid rgba(80,200,80,0.2)", color: "#80d080" }}>
              <CheckCircle2 size={14} /> Verified! Signing you in…
            </motion.div>
          )}
        </AnimatePresence>
        <button
          type="submit"
          disabled={status === "loading" || status === "success" || otp.length !== 6}
          style={cardStyles.primaryBtn}
          onMouseEnter={(e) => { if (status === "idle") (e.currentTarget as HTMLButtonElement).style.filter = "brightness(1.1)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = "brightness(1)"; }}
        >
          {status === "loading"
            ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Verifying…</>
            : <><CheckCircle2 size={16} /> {submitLabel}</>}
        </button>
        <div style={{ textAlign: "center", fontSize: "0.84rem", color: "rgba(255,255,255,0.45)" }}>
          {cooldown > 0 ? (
            <span>Resend in {cooldown}s</span>
          ) : (
            <button type="button" onClick={onResend} style={cardStyles.resendBtn}>
              <RotateCcw size={13} /> Resend code
            </button>
          )}
        </div>
        <button type="button" onClick={onBack} style={cardStyles.backLink}>← Change email</button>
      </form>
    </>
  );
}

/* ── Styles ── */

const pageStyles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "var(--page-bg)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1.5rem",
    position: "relative",
    overflow: "hidden",
  },
  bgPattern: {
    position: "absolute",
    inset: 0,
    backgroundImage: `
      linear-gradient(45deg, rgba(128,128,128,0.04) 25%, transparent 25%),
      linear-gradient(-45deg, rgba(128,128,128,0.04) 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, rgba(128,128,128,0.04) 75%),
      linear-gradient(-45deg, transparent 75%, rgba(128,128,128,0.04) 75%)
    `,
    backgroundSize: "60px 60px",
    backgroundPosition: "0 0, 0 30px, 30px -30px, -30px 0px",
    pointerEvents: "none",
  },
  card: {
    width: "100%",
    maxWidth: "400px",
    background: "var(--auth-card-bg)",
    borderRadius: "10px",
    padding: "1.75rem 1.75rem 2rem",
    boxShadow: "0 24px 80px rgba(0,0,0,0.18)",
    border: "1px solid var(--card-border)",
    position: "relative",
    zIndex: 1,
  },
};

const cardStyles: Record<string, React.CSSProperties> = {
  header: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.35rem",
    marginBottom: "1.25rem",
  },
  logo: {
    display: "flex",
    alignItems: "baseline",
    gap: "0.18rem",
    marginBottom: "0.35rem",
  },
  logoPawn: { fontSize: "1.2rem", color: "#81b64c", filter: "drop-shadow(0 0 4px rgba(129,182,76,0.5))" },
  logoWord: { fontSize: "1.15rem", fontWeight: 800, color: "var(--text-primary)" },
  logoDot: { fontSize: "0.8rem", color: "var(--text-muted)" },
  heading: { fontSize: "1.35rem", fontWeight: 800, color: "var(--text-primary)", textAlign: "center", lineHeight: 1.25, margin: 0 },
  subheading: { fontSize: "0.83rem", color: "var(--text-muted)", textAlign: "center", margin: 0 },
  form: { display: "flex", flexDirection: "column", gap: "0.6rem" },
  inputWrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    background: "var(--auth-input-overlay)",
    border: "1px solid var(--auth-input-border)",
    borderRadius: "6px",
  },
  inputIcon: { display: "flex", alignItems: "center", padding: "0 0.7rem", color: "var(--text-muted)", flexShrink: 0 },
  input: {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    padding: "0.72rem 0.5rem 0.72rem 0",
    color: "var(--text-primary)",
    fontSize: "0.9rem",
  },
  eyeBtn: { position: "absolute", right: "0.7rem", background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 },
  rememberRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", fontSize: "0.82rem", color: "var(--text-muted)" },
  rememberLabel: { display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" },
  forgotBtn: { background: "none", border: "none", color: "#81b64c", fontSize: "0.82rem", cursor: "pointer", padding: 0, fontWeight: 600 },
  errorBox: {
    display: "flex", alignItems: "center", gap: "0.5rem",
    color: "#c0392b", fontSize: "0.81rem",
    background: "rgba(192,57,43,0.08)", border: "1px solid rgba(192,57,43,0.2)",
    borderRadius: "6px", padding: "0.55rem 0.75rem",
  },
  primaryBtn: {
    width: "100%", padding: "0.78rem",
    background: "linear-gradient(135deg, #81b64c, #5a8a2a)",
    border: "none", borderRadius: "6px", color: "#fff",
    fontWeight: 800, fontSize: "0.95rem", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: "0.45rem",
    transition: "filter 0.15s", boxShadow: "0 4px 16px rgba(100,180,40,0.28)",
    marginTop: "0.2rem", letterSpacing: "0.01em",
  },
  backLink: { background: "none", border: "none", color: "var(--text-muted)", fontSize: "0.8rem", cursor: "pointer", textAlign: "center" },
  resendBtn: { color: "#81b64c", fontWeight: 700, background: "none", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.3rem" },
  footerText: { fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "center", margin: "0.2rem 0 0" },
  footerLink: { color: "#81b64c", fontWeight: 700, textDecoration: "none" },
  otpInput: {
    width: "100%", padding: "1rem", fontSize: "2.2rem", fontWeight: 800,
    letterSpacing: "0.75rem", textAlign: "center", borderRadius: "8px",
    background: "var(--auth-input-overlay)", border: "1px solid var(--auth-input-border)",
    color: "var(--text-primary)", outline: "none", fontFamily: "monospace", transition: "border-color 0.2s",
  },
};
