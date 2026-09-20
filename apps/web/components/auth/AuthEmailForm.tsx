"use client";

import React, { useState } from "react";
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";

interface AuthEmailFormProps {
  onSubmit: (
    email: string,
    password: string,
    username?: string,
  ) => Promise<void>;
  isLoading?: boolean;
  error?: string;
  submitLabel?: string;
  showUsername?: boolean;
  onBack?: () => void;
  title?: string;
  subtitle?: string;
}

export function AuthEmailForm({
  onSubmit,
  isLoading = false,
  error,
  submitLabel = "Continue",
  showUsername = false,
  onBack,
  title = "Enter Your Email and a Password",
  subtitle = "This allows you to log in on any device",
}: AuthEmailFormProps) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(email, password, showUsername ? username : undefined);
  };

  return (
    <div style={s.root}>
      {/* Back + Logo row */}
      <div style={s.topRow}>
        {onBack && (
          <button type="button" onClick={onBack} style={s.backBtn}>
            <ArrowLeft size={18} />
          </button>
        )}
        <div style={s.logo}>
          <span style={s.logoPawn}>♟</span>
          <span style={s.logoWord}>Rooky</span>
          <span style={s.logoDot}>.com</span>
        </div>
        <div style={{ width: onBack ? "2rem" : 0 }} />
      </div>

      <h1 style={s.heading}>{title}</h1>
      <p style={s.subtitle}>{subtitle}</p>

      <form onSubmit={handleSubmit} style={s.form}>
        {showUsername && (
          <div style={s.inputWrap}>
            <span style={s.inputIcon}>
              <User size={15} />
            </span>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              autoComplete="username"
              style={s.input}
            />
          </div>
        )}

        <div style={s.inputWrap}>
          <span style={s.inputIcon}>
            <Mail size={15} />
          </span>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            style={s.input}
          />
        </div>

        <div style={s.inputWrap}>
          <span style={s.inputIcon}>
            <Lock size={15} />
          </span>
          <input
            type={showPw ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            style={{ ...s.input, paddingRight: "2.6rem" }}
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            style={s.eyeBtn}
            tabIndex={-1}
          >
            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>

        {error && (
          <div style={s.errorBox}>
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          style={s.submitBtn}
          onMouseEnter={(e) => {
            if (!isLoading)
              (e.currentTarget as HTMLButtonElement).style.filter =
                "brightness(1.1)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.filter =
              "brightness(1)";
          }}
        >
          {isLoading ? (
            <>
              <Loader2
                size={16}
                style={{ animation: "spin 1s linear infinite" }}
              />
              Sending…
            </>
          ) : (
            submitLabel
          )}
        </button>
      </form>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.75rem",
    width: "100%",
  },
  topRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: "0.25rem",
  },
  backBtn: {
    width: "2rem",
    height: "2rem",
    background: "var(--auth-input-overlay)",
    border: "1px solid var(--auth-input-border)",
    borderRadius: "6px",
    color: "var(--text-primary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
  },
  logo: {
    display: "flex",
    alignItems: "baseline",
    gap: "0.18rem",
  },
  logoPawn: {
    fontSize: "1.15rem",
    color: "#81b64c",
  },
  logoWord: {
    fontSize: "1.1rem",
    fontWeight: 800,
    color: "var(--text-primary)",
  },
  logoDot: {
    fontSize: "0.78rem",
    color: "var(--text-muted)",
  },
  heading: {
    fontSize: "1.25rem",
    fontWeight: 800,
    color: "var(--text-primary)",
    textAlign: "center",
    lineHeight: 1.25,
    margin: "0.1rem 0 0",
  },
  subtitle: {
    fontSize: "0.82rem",
    color: "var(--text-muted)",
    textAlign: "center",
    margin: "0 0 0.25rem",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "0.65rem",
    width: "100%",
  },
  inputWrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    background: "var(--auth-input-overlay)",
    border: "1px solid var(--auth-input-border)",
    borderRadius: "6px",
    overflow: "visible",
  },
  inputIcon: {
    display: "flex",
    alignItems: "center",
    padding: "0 0.7rem",
    color: "var(--text-muted)",
    flexShrink: 0,
  },
  input: {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    padding: "0.72rem 0.5rem 0.72rem 0",
    color: "var(--text-primary)",
    fontSize: "0.9rem",
  },
  eyeBtn: {
    position: "absolute",
    right: "0.7rem",
    background: "transparent",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    padding: 0,
  },
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    color: "#c0392b",
    fontSize: "0.81rem",
    background: "rgba(192,57,43,0.08)",
    border: "1px solid rgba(192,57,43,0.2)",
    borderRadius: "6px",
    padding: "0.55rem 0.75rem",
  },
  submitBtn: {
    width: "100%",
    padding: "0.78rem",
    background: "linear-gradient(135deg, #81b64c, #5a8a2a)",
    border: "none",
    borderRadius: "6px",
    color: "#fff",
    fontWeight: 800,
    fontSize: "0.95rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    transition: "filter 0.15s",
    boxShadow: "0 4px 16px rgba(100,180,40,0.28)",
    marginTop: "0.15rem",
    letterSpacing: "0.01em",
  },
};
