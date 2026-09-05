"use client";

import { useEffect } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";

export function ThemeApplier() {
  const darkUI = useSelector((state: RootState) => state.sidebar.darkUI);

  useEffect(() => {
    document.body.classList.toggle("dark-ui", darkUI);
    document.documentElement.style.colorScheme = darkUI ? "dark" : "light";
  }, [darkUI]);

  return null;
}
