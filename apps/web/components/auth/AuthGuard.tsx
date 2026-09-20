"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import styles from "./AuthGuard.module.css";

export function AuthLoadingSplash({
  message = "Verifying session...",
}: {
  message?: string;
}) {
  return (
    <div className={styles.splashContainer}>
      <div className={styles.splashCard}>
        <div className={styles.iconWrapper}>♜</div>
        <h2 className={styles.title}>Rooky Arena</h2>
        <p className={styles.subtitle}>
          <span className={styles.spinner} />
          {message}
        </p>
      </div>
    </div>
  );
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("user_token");
      const userStr = localStorage.getItem("user");

      if (!token || !userStr) {
        setIsAuthenticated(false);
        setIsChecking(false);
        const loginUrl = `/auth/login?from=${encodeURIComponent(pathname || "/")}`;
        router.replace(loginUrl);
        return;
      }

      try {
        const user = JSON.parse(userStr);
        if (user && user.id) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          router.replace("/auth/login");
        }
      } catch {
        setIsAuthenticated(false);
        router.replace("/auth/login");
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [pathname, router]);

  if (isChecking || !isAuthenticated) {
    return <AuthLoadingSplash message="Verifying session..." />;
  }

  return <>{children}</>;
}
