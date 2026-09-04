"use client";

import React from "react";
import { motion } from "framer-motion";
import { Upload, UserPlus, LogOut, Loader2 } from "lucide-react";
import Link from "next/link";
import { useAdminAuth } from "../../hooks/useAdminAuth";
import styles from "./AdminDashboard.module.css";

const cards = [
  {
    href: "/upload",
    icon: Upload,
    color: "#f28b38",
    bg: "rgba(242,139,56,0.10)",
    border: "rgba(242,139,56,0.28)",
    title: "Upload Puzzle",
    desc: "Add a new chess puzzle to the database with FEN, solution, and rating.",
  },
  {
    href: "/admin/create",
    icon: UserPlus,
    color: "#059669",
    bg: "rgba(5,150,105,0.10)",
    border: "rgba(5,150,105,0.28)",
    title: "Add Administrator",
    desc: "Grant admin access to a new account. They will sign in via email OTP.",
  },
];

export default function AdminDashboard() {
  const { isAdmin, logout } = useAdminAuth();

  if (isAdmin === null) {
    return (
      <main className={`adminPage ${styles.centerLoader}`}>
        <Loader2 size={32} className={`animate-spin ${styles.spinner}`} />
      </main>
    );
  }

  if (!isAdmin) return null;

  return (
    <main className={`adminPage ${styles.container}`}>
      <div className={styles.wrapper}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex flex-col gap-10"
        >
          {/* Header */}
          <div className={styles.header}>
            <div>
              <p className={styles.kicker}>Rooky</p>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gradient">
                Admin Dashboard
              </h1>
              <p className={styles.subtitle}>
                Manage puzzles and administrator accounts.
              </p>
            </div>
            <button
              onClick={logout}
              className="btn-outline flex items-center gap-2 text-sm py-2 px-4 shrink-0"
            >
              <LogOut size={15} />
              Sign Out
            </button>
          </div>

          {/* Action cards */}
          <div className={styles.grid}>
            {cards.map((card, i) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={card.href}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + i * 0.07 }}
                >
                  <Link
                    href={card.href}
                    className="glass-panel glass-panel-hover flex items-start sm:items-center gap-4 sm:gap-5 p-4 sm:p-6 transition-all duration-200 group"
                  >
                    <div
                      className={styles.cardIcon}
                      style={{
                        background: card.bg,
                        border: `1px solid ${card.border}`,
                      }}
                    >
                      <Icon size={24} style={{ color: card.color }} />
                    </div>
                    <div>
                      <h2 className={styles.cardTitle}>{card.title}</h2>
                      <p className={styles.cardDesc}>{card.desc}</p>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </main>
  );
}
