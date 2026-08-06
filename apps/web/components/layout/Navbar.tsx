"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { History, Swords, User, ShieldCheck, Menu, X } from "lucide-react";
import styles from "./Navbar.module.css";
import { getAdminToken, clearAdminToken } from "../../hooks/useAdminAuth";
import { getUserToken, clearUserSession } from "../../hooks/useAuth";
import { useEffect, useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setIsAdmin(!!getAdminToken());
    setIsLoggedIn(!!getUserToken());
  }, [pathname]);

  /* Close mobile menu on route change */
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleAdminLogout = () => {
    clearAdminToken();
    setIsAdmin(false);
    setMobileOpen(false);
    router.push("/");
  };

  const handleUserLogout = () => {
    clearUserSession();
    setIsLoggedIn(false);
    setMobileOpen(false);
    router.push("/");
  };

  const navItems = [
    { href: "/arena",   label: "Arena",   icon: <Swords  size={16} /> },
    { href: "/history", label: "History", icon: <History size={16} /> },
    { href: "/profile", label: "Profile", icon: <User    size={16} /> },
  ];

  return (
    <>
      <nav className={styles.navbar}>
        <div className={styles.logoContainer}>
          <Link href="/" className={styles.logo}>
            <span className={styles.logoMark}>♜</span>
            <span className={styles.logoText}>Rooky</span>
          </Link>
        </div>

        {/* Desktop nav links */}
        <div className={styles.navLinks}>
          {navItems.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className={`${styles.navLink} ${pathname === href ? styles.navLinkActive : ""}`}
            >
              {icon}
              <span>{label}</span>
            </Link>
          ))}

          {isAdmin && (
            <Link
              href="/upload"
              className={`${styles.navLink} ${pathname === "/upload" ? styles.navLinkActive : ""}`}
            >
              <ShieldCheck size={16} />
              <span>Admin</span>
            </Link>
          )}
        </div>

        {/* Desktop auth actions */}
        <div className={styles.authActions}>
          {isAdmin ? (
            <>
              <span className={styles.adminBadge}>
                <ShieldCheck size={13} />
                Admin
              </span>
              <button onClick={handleAdminLogout} className={styles.btnOutline}>
                Sign Out
              </button>
            </>
          ) : isLoggedIn ? (
            <button onClick={handleUserLogout} className={styles.btnOutline}>
              Logout
            </button>
          ) : (
            <>
              <Link href="/auth/login" className={styles.btnOutline}>
                Log In
              </Link>
              <Link href="/auth/signup" className={styles.btnPrimary}>
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Hamburger — mobile only */}
        <button
          type="button"
          className={styles.hamburger}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile menu drawer */}
      {mobileOpen && (
        <div className={styles.mobileOverlay} onClick={() => setMobileOpen(false)}>
          <div
            className={styles.mobileDrawer}
            onClick={(e) => e.stopPropagation()}
          >
            <nav className={styles.mobileNavLinks}>
              {navItems.map(({ href, label, icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={`${styles.mobileNavLink} ${pathname === href ? styles.mobileNavLinkActive : ""}`}
                  onClick={() => setMobileOpen(false)}
                >
                  {icon}
                  <span>{label}</span>
                </Link>
              ))}

              {isAdmin && (
                <Link
                  href="/upload"
                  className={`${styles.mobileNavLink} ${pathname === "/upload" ? styles.mobileNavLinkActive : ""}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <ShieldCheck size={18} />
                  <span>Admin</span>
                </Link>
              )}
            </nav>

            <div className={styles.mobileAuthActions}>
              {isAdmin ? (
                <button onClick={handleAdminLogout} className={`${styles.btnOutline} ${styles.mobileAuthBtn}`}>
                  Sign Out
                </button>
              ) : isLoggedIn ? (
                <button onClick={handleUserLogout} className={`${styles.btnOutline} ${styles.mobileAuthBtn}`}>
                  Logout
                </button>
              ) : (
                <>
                  <Link href="/auth/login" className={`${styles.btnOutline} ${styles.mobileAuthBtn}`} onClick={() => setMobileOpen(false)}>
                    Log In
                  </Link>
                  <Link href="/auth/signup" className={`${styles.btnPrimary} ${styles.mobileAuthBtn}`} onClick={() => setMobileOpen(false)}>
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
