"use client";

import { Menu } from "lucide-react";
import { useDispatch } from "react-redux";
import Link from "next/link";
import type { AppDispatch } from "../../store";
import { openMobileNav } from "../../store/slices/sidebarSlice";
import styles from "./MobileArenaHeader.module.css";

export function MobileArenaHeader() {
  const dispatch = useDispatch<AppDispatch>();

  return (
    <header className={styles.header}>
      <button
        type="button"
        className={styles.menuBtn}
        aria-label="Open navigation"
        onClick={() => dispatch(openMobileNav())}
      >
        <Menu size={22} />
      </button>
      <Link href="/" className={styles.logo}>
        <span className={styles.logoMark}>♜</span>
        <span className={styles.logoText}>Rooky</span>
      </Link>
    </header>
  );
}
