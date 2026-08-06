"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function useAdminAuth(redirectTo = "/admin/login") {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      router.replace(redirectTo);
      setIsAdmin(false);
    } else {
      setIsAdmin(true);
    }
  }, [redirectTo, router]);

  const logout = () => {
    localStorage.removeItem("admin_token");
    document.cookie =
      "admin_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.replace("/admin/login");
  };

  return { isAdmin, logout };
}

export function setAdminToken(token: string) {
  localStorage.setItem("admin_token", token);
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `admin_token=${token}; expires=${expires}; path=/; SameSite=Strict`;
}

export function clearAdminToken() {
  localStorage.removeItem("admin_token");
  document.cookie =
    "admin_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
}

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_token");
}
