"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";
import { useInvites } from "../../hooks/useInvites";
import InviteCard from "./InviteCard";
import styles from "./invite.module.css";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 350, damping: 25 } },
};

export default function ReceivedInvitesPage() {
  const router = useRouter();
  const darkUI = useSelector((s: RootState) => s.sidebar.darkUI);

  const {
    receivedInvites,
    loadingReceived,
    actionLoading,
    fetchReceived,
    acceptInvite,
    rejectInvite,
  } = useInvites();

  useEffect(() => {
    fetchReceived();
    if (darkUI) {
      document.body.classList.add("dark-ui");
    } else {
      document.body.classList.remove("dark-ui");
    }
  }, [fetchReceived, darkUI]);

  const pendingInvites = receivedInvites.filter((inv) => inv.status === "PENDING");
  const pastInvites = receivedInvites.filter((inv) => inv.status !== "PENDING");

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
          <span>🔔</span> Game Invitations
        </div>
        <div className={styles.headerActions}>
          <Link href="/arena/invite" className={styles.headerLink}>
            + New Challenge
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: 640 }}>
        {loadingReceived ? (
          <div className={styles.loadingWrap}>
            <div className={styles.spinner} />
            <span style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.4)" }}>
              Loading invitations…
            </span>
          </div>
        ) : receivedInvites.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={styles.emptyState}
          >
            <span className={styles.emptyIcon}>📭</span>
            <span className={styles.emptyTitle}>No invitations yet</span>
            <span className={styles.emptySubtitle}>
              When friends challenge you, they&apos;ll appear here
            </span>
          </motion.div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="show">
            {/* Pending */}
            {pendingInvites.length > 0 && (
              <div style={{ marginBottom: "1.5rem" }}>
                <div className={styles.sectionHeading}>
                  <span className={styles.sectionDot} />
                  Pending ({pendingInvites.length})
                </div>
                <div className={styles.cardList}>
                  {pendingInvites.map((inv) => (
                    <motion.div key={inv.id} variants={itemVariants}>
                      <InviteCard
                        inv={inv}
                        onAccept={() => acceptInvite(inv.id)}
                        onReject={() => rejectInvite(inv.id)}
                        isLoading={actionLoading === inv.id}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Past */}
            {pastInvites.length > 0 && (
              <div>
                <div className={styles.sectionHeading} style={{ color: "rgba(255,255,255,0.25)" }}>
                  Past ({pastInvites.length})
                </div>
                <div className={styles.cardList}>
                  {pastInvites.map((inv) => (
                    <motion.div key={inv.id} variants={itemVariants}>
                      <InviteCard inv={inv} />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
