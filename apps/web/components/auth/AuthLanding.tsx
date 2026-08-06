"use client";

import React from "react";
import Link from "next/link";
import { GoogleAuthButton } from "./GoogleAuthButton";

interface AuthLandingProps {
  mode: "login" | "signup";
  onContinueWithEmail: () => void;
}

export function AuthLanding({ mode, onContinueWithEmail }: AuthLandingProps) {
  const isSignup = mode === "signup";

  return (
    <div style={s.root}>
      {/* Top-right toggle link */}
      <Link href={isSignup ? "/auth/login" : "/auth/signup"} style={s.topLink}>
        {isSignup ? "Log In" : "Sign Up"}
      </Link>

      {/* Logo */}
      <div style={s.logo}>
        <span style={s.logoPawn}>♟</span>
        <span style={s.logoWord}>Rooky</span>
      </div>

      {/* Heading */}
      <h1 style={s.heading}>
        {isSignup ? "Create Your Rooky Account" : "Welcome Back"}
      </h1>

      {/* Hero pawn */}
      <div style={s.heroWrap}>
        <div style={s.heroGlowOuter} />
        <span style={s.heroPawn} aria-hidden="true">♟</span>
        <div style={s.heroGlowBelow} />
      </div>

      {/* Primary CTA */}
      <button
        type="button"
        onClick={onContinueWithEmail}
        style={s.emailBtn}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.filter = "brightness(1.1)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.filter = "brightness(1)";
        }}
      >
        {isSignup ? "Continue with Email" : "Sign In with Email"}
      </button>

      {/* OR divider */}
      <div style={s.divider}>
        <span style={s.dividerLine} />
        <span style={s.dividerText}>OR</span>
        <span style={s.dividerLine} />
      </div>

      {/* Google */}
      <GoogleAuthButton mode={mode} />

      {/* Bottom link */}
      <p style={s.bottomText}>
        {isSignup ? (
          <>
            Already have an account?{" "}
            <Link href="/auth/login" style={s.bottomLink}>
              Log In
            </Link>
          </>
        ) : (
          <>
            New?{" "}
            <Link href="/auth/signup" style={s.bottomLink}>
              Sign up — and start playing chess!
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.8rem",
    width: "100%",
    position: "relative",
    paddingTop: "0.75rem",
  },
  topLink: {
    position: "absolute",
    top: 0,
    right: 0,
    color: "var(--text-muted)",
    fontSize: "0.87rem",
    fontWeight: 700,
    textDecoration: "none",
    transition: "color 0.15s",
  },
  logo: {
    display: "flex",
    alignItems: "baseline",
    gap: "0.18rem",
    marginBottom: "0.1rem",
  },
  logoPawn: {
    fontSize: "1.3rem",
    color: "#81b64c",
    filter: "drop-shadow(0 0 4px rgba(129,182,76,0.5))",
  },
  logoWord: {
    fontSize: "1.25rem",
    fontWeight: 800,
    color: "var(--text-primary)",
    letterSpacing: "-0.01em",
  },
  logoDot: {
    fontSize: "0.85rem",
    color: "var(--text-muted)",
    fontWeight: 400,
  },
  heading: {
    fontSize: "1.45rem",
    fontWeight: 800,
    color: "var(--text-primary)",
    textAlign: "center",
    lineHeight: 1.25,
    margin: "0 0 0.25rem",
  },
  heroWrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "72px",
    marginBottom: "0.35rem",
  },
  heroGlowOuter: {
    position: "absolute",
    width: "100px",
    height: "100px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(129,182,76,0.18) 0%, transparent 70%)",
  },
  heroPawn: {
    fontSize: "3.2rem",
    color: "#81b64c",
    filter: "drop-shadow(0 2px 14px rgba(129,182,76,0.7))",
    position: "relative",
    zIndex: 1,
    lineHeight: 1,
  },
  heroGlowBelow: {
    position: "absolute",
    bottom: "-2px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "72px",
    height: "14px",
    background: "radial-gradient(ellipse, rgba(129,182,76,0.3) 0%, transparent 70%)",
    borderRadius: "50%",
  },
  emailBtn: {
    width: "100%",
    padding: "0.78rem",
    background: "linear-gradient(135deg, #81b64c, #5a8a2a)",
    border: "none",
    borderRadius: "6px",
    color: "#fff",
    fontWeight: 800,
    fontSize: "0.94rem",
    cursor: "pointer",
    transition: "filter 0.15s",
    boxShadow: "0 4px 16px rgba(100,180,40,0.28)",
    letterSpacing: "0.01em",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: "0.7rem",
    width: "100%",
  },
  dividerLine: {
    flex: 1,
    height: "1px",
    background: "var(--auth-input-border)",
    display: "block",
  },
  dividerText: {
    fontSize: "0.7rem",
    color: "var(--text-faint)",
    fontWeight: 700,
    letterSpacing: "0.1em",
  },
  socialBtn: {
    width: "100%",
    padding: "0.68rem",
    background: "var(--auth-input-overlay)",
    border: "1px solid var(--auth-input-border)",
    borderRadius: "6px",
    color: "var(--text-primary)",
    fontWeight: 600,
    fontSize: "0.88rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.6rem",
    transition: "background 0.15s",
  },
  bottomText: {
    fontSize: "0.82rem",
    color: "var(--text-muted)",
    textAlign: "center",
    marginTop: "0.25rem",
  },
  bottomLink: {
    color: "#81b64c",
    fontWeight: 700,
    textDecoration: "none",
  },
};
