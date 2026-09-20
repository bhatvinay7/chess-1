"use client";

import React, { useEffect, useState, useRef } from "react";
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
            callback?: (response: { credential?: string }) => void;
            cancel_on_tap_outside?: boolean;
            use_fedcm_for_prompt?: boolean;
            ux_mode?: "popup" | "redirect";
            login_uri?: string;
          }) => void;
          prompt: (
            notification?: (notification: {
              isNotDisplayed: () => boolean;
              isSkippedMoment: () => boolean;
            }) => void,
          ) => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, unknown>,
          ) => void;
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
  const buttonRef = useRef<HTMLDivElement>(null);

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

  // handleGoogleCallback is still here for fallback, but redirect mode won't use it directly
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
          "Google authentication failed. Please check your credentials or try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!scriptLoaded || !window.google?.accounts?.id || !buttonRef.current)
      return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleCallback, // Fallback if redirect fails
      cancel_on_tap_outside: true,
      use_fedcm_for_prompt: true,
      ux_mode: "redirect",
      login_uri: `${window.location.origin}/api/auth/google/callback`,
    });

    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: "filled_black",
      size: "large",
      type: "standard",
      text: mode === "signup" ? "signup_with" : "continue_with",
      shape: "rectangular",
      logo_alignment: "left",
    });
  }, [scriptLoaded, clientId, mode]);

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.5rem",
      }}
    >
      <div
        ref={buttonRef}
        style={{
          display: "flex",
          justifyContent: "center",
          width: "100%",
          opacity: loading ? 0.5 : 1,
          pointerEvents: loading ? "none" : "auto",
        }}
      />

      {loading && (
        <p
          style={{
            fontSize: "0.8rem",
            color: "#a0a0a0",
            textAlign: "center",
            margin: 0,
          }}
        >
          Signing in with Google...
        </p>
      )}

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
