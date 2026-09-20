"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "../../../api/auth/auth";
import { setUserSession } from "../../../../hooks/useAuth";
import { Loader2 } from "lucide-react";

export default function GoogleProcessPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processToken = async () => {
      const idToken = sessionStorage.getItem("google_id_token");
      if (!idToken) {
        setError("No Google credential found.");
        setTimeout(() => router.replace("/auth/login"), 2000);
        return;
      }

      sessionStorage.removeItem("google_id_token");

      try {
        const data = await authApi.loginWithGoogle(idToken);
        setUserSession(data.token, data.user);
        router.replace("/");
      } catch (err: unknown) {
        console.error(err);
        const axiosErr = err as { response?: { data?: { message?: string } } };
        setError(
          axiosErr.response?.data?.message || "Google authentication failed.",
        );
        setTimeout(() => router.replace("/auth/login"), 3000);
      }
    };

    processToken();
  }, [router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--page-bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          background: "var(--auth-card-bg)",
          padding: "2rem",
          borderRadius: "10px",
          border: "1px solid var(--card-border)",
          textAlign: "center",
          maxWidth: "400px",
          width: "100%",
        }}
      >
        {error ? (
          <p style={{ color: "#e74c3c", margin: 0, fontSize: "0.9rem" }}>
            {error}
            <br />
            <br />
            Redirecting to login...
          </p>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <Loader2
              size={32}
              style={{ animation: "spin 1s linear infinite", color: "#81b64c" }}
            />
            <p
              style={{
                color: "var(--text-primary)",
                margin: 0,
                fontWeight: 600,
              }}
            >
              Completing Sign-In...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
