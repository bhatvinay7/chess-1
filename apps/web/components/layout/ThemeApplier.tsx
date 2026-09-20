"use client";

import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../store";
import { setDarkUI } from "../../store/slices/sidebarSlice";

const THEME_STORAGE_KEY = "rooky-dark-ui";

export function ThemeApplier() {
  const dispatch = useDispatch<AppDispatch>();
  const darkUI = useSelector((state: RootState) => state.sidebar.darkUI);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current) return;
    document.body.classList.toggle("dark-ui", darkUI);
    document.documentElement.style.colorScheme = darkUI ? "dark" : "light";
    window.localStorage.setItem(THEME_STORAGE_KEY, darkUI ? "dark" : "light");
  }, [darkUI]);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    const shouldUseDark = savedTheme === "dark";

    document.body.classList.toggle("dark-ui", shouldUseDark);
    document.documentElement.style.colorScheme = shouldUseDark
      ? "dark"
      : "light";
    initializedRef.current = true;
    dispatch(setDarkUI(shouldUseDark));
  }, [dispatch]);

  return null;
}
