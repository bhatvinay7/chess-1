"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";
import { useInvites } from "../../hooks/useInvites";
import InviteForm from "./InviteForm";
import SentInvitesList from "./SentInvitesList";
import styles from "./invite.module.css";

export default function InvitePage() {
  const router = useRouter();
  const darkUI = useSelector((s: RootState) => s.sidebar.darkUI);

  const {
    sentInvites,
    loadingSent,
    actionLoading,
    error,
    fetchSent,
    sendInvite,
  } = useInvites();

  useEffect(() => {
    fetchSent();
    if (darkUI) {
      document.body.classList.add("dark-ui");
    } else {
      document.body.classList.remove("dark-ui");
    }
  }, [fetchSent, darkUI]);

  const handleSend = async (body: any) => {
    await sendInvite(body);
    await fetchSent();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={styles.page}
    >
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.back()}>
          <span>←</span> Back
        </button>
        <div className={styles.headerTitle}>
          <span>⚔</span> Send Challenge
        </div>
        <div className={styles.headerActions}>
          <Link href="/arena/invite/received" className={styles.headerLink}>
            Inbox
          </Link>
          <Link href="/notifications" className={styles.headerLink}>
            Notifications
          </Link>
        </div>
      </div>

      <div className={styles.splitGrid}>
        {/* Left: Create Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 24,
            delay: 0.05,
          }}
          className={styles.panel}
        >
          <div className={styles.panelHeader}>
            <span>⚙</span> Configure Game
          </div>
          <InviteForm
            onSend={handleSend}
            actionLoading={actionLoading !== null}
            error={error}
          />
        </motion.div>

        {/* Right: Sent Invites History */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 24,
            delay: 0.1,
          }}
          className={styles.panel}
        >
          <div className={styles.panelHeader}>
            <span>📤</span> Sent Challenges
            {sentInvites.length > 0 && (
              <span className={styles.panelBadge}>{sentInvites.length}</span>
            )}
          </div>
          {loadingSent ? (
            <div className={styles.loadingWrap}>
              <div className={styles.spinner} />
              <span
                style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}
              >
                Loading...
              </span>
            </div>
          ) : (
            <SentInvitesList invites={sentInvites} />
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
