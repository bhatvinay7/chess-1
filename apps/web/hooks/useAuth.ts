"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface AuthUser {
  id: string;
  username: string;
  email: string | null;
  rating: number;
}

export function useAuth(redirectTo = "/auth/login") {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("user");
    const token = localStorage.getItem("user_token");
    if (!token || !stored) {
      router.replace(redirectTo);
      setUser(null);
    } else {
      try {
        setUser(JSON.parse(stored));
      } catch {
        setUser(null);
        router.replace(redirectTo);
      }
    }
  }, [redirectTo, router]);

  const logout = () => {
    localStorage.removeItem("user_token");
    localStorage.removeItem("user");
    router.replace("/auth/login");
  };

  return { user, logout };
}

export function setUserSession(token: string, user: AuthUser) {
  localStorage.setItem("user_token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

export function getUserToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("user_token");
}

export function clearUserSession() {
  localStorage.removeItem("user_token");
  localStorage.removeItem("user");
}
