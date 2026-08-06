"use client";

import { useEffect } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";

export function ThemeApplier() {
  const darkUI = useSelector((s: RootState) => s.sidebar.darkUI);

  useEffect(() => {
    document.body.classList.toggle("dark-ui", darkUI);
  }, [darkUI]);

  return null;
}
