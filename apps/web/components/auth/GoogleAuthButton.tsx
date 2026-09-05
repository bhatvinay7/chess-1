"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "../../app/api/auth/auth";
import { setUserSession } from "../../hooks/useAuth";

interface GoogleAuthButtonProps {
  mode?: "login" | "signup";
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
            cancel_on_tap_outside?: boolean;
          }) => void;
          prompt: (
            notification?: (notification: {
              isNotDisplayed: () => boolean;
              isSkippedMoment: () => boolean;
            }) => void
          ) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export function GoogleAuthButton({ mode = "login" }: GoogleAuthButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  const clientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    "831209381209-abc123mockclientid.apps.googleusercontent.com";

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.google?.accounts?.id) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setScriptLoaded(true);
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup script if needed
    };
  }, []);

  useEffect(() => {
    if (!scriptLoaded || !window.google?.accounts?.id) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleCallback,
      cancel_on_tap_outside: true,
    });
  }, [scriptLoaded, clientId]);

  const handleGoogleCallback = async (response: { credential?: string }) => {
    if (!response.credential) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await authApi.loginWithGoogle(response.credential);
      setUserSession(data.token, data.user);
      router.replace("/");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setErrorMsg(
        error.response?.data?.message ||
          "Google authentication failed. Please check your credentials or try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => {
    if (!window.google?.accounts?.id) {
      setErrorMsg("Google Sign-In is still loading. Please try again in a moment.");
      return;
    }
    window.google.accounts.id.prompt((notification) => {
      if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
        setErrorMsg("Please enable popups or configure your Google Client ID in .env.");
      }
    });
  };

  return (
    <div style={{ width: "100%" }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        style={{
          width: "100%",
          padding: "0.68rem",
          background: "var(--auth-input-overlay, rgba(255, 255, 255, 0.06))",
          border: "1px solid var(--auth-input-border, rgba(255, 255, 255, 0.12))",
          borderRadius: "6px",
          color: "var(--text-primary, #ffffff)",
          fontWeight: 600,
          fontSize: "0.88rem",
          cursor: loading ? "wait" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.6rem",
          transition: "background 0.15s",
          opacity: loading ? 0.7 : 1,
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            (e.currentTarget as HTMLButtonElement).style.background =
              "rgba(255,255,255,0.1)";
          }
        }}
        onMouseLeave={(e) => {
          if (!loading) {
            (e.currentTarget as HTMLButtonElement).style.background =
              "rgba(255,255,255,0.06)";
          }
        }}
      >
        <GoogleIcon />
        {loading
          ? "Signing in with Google..."
          : mode === "signup"
          ? "Sign Up with Google"
          : "Continue with Google"}
      </button>

      {errorMsg && (
        <p
          style={{
            fontSize: "0.78rem",
            color: "#e74c3c",
            textAlign: "center",
            marginTop: "0.4rem",
            lineHeight: 1.3,
          }}
        >
          {errorMsg}
        </p>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
