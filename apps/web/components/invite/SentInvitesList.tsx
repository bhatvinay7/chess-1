"use client";

import React from "react";
import type { Invite } from "../../hooks/useInvites";
import styles from "./invite.module.css";
import { motion, AnimatePresence, type Variants } from "framer-motion";

interface Props {
  invites: Invite[];
}

const colorEmoji = (c?: string) =>
  c === "white" ? "⬜" : c === "black" ? "⬛" : "🎲";

const statusClass = (s: string) =>
  s === "ACCEPTED" ? styles.statusAccepted :
  s === "REJECTED" ? styles.statusRejected :
  styles.statusPending;

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } }
};

export default function SentInvitesList({ invites }: Props) {
  if (invites.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={styles.emptyState}
      >
        <span className={styles.emptyIcon}>📭</span>
        <span className={styles.emptyTitle}>No challenges sent yet</span>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className={styles.sentList}
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <AnimatePresence>
        {invites.map((inv) => (
          <motion.div key={inv.id} variants={itemVariants} layout className={styles.sentRow}>
            <div className={styles.sentAvatar}>
              {inv.receiver?.username?.charAt(0)?.toUpperCase() ?? inv.receiverId?.charAt(0)?.toUpperCase() ?? "?"}
            </div>
            <div className={styles.sentMeta}>
              <div className={styles.sentMetaName}>
                {inv.receiver?.username || inv.receiverId}
              </div>
              <div className={styles.sentMetaTop}>
                <span>{inv.payload?.gameMode === "chess960" ? "⚄ 960" : "♟ STD"}</span>
                <span className={styles.sentMetaDot}>·</span>
                <span>{inv.payload?.timeControl}</span>
                <span className={styles.sentMetaDot}>·</span>
                <span>{colorEmoji(inv.payload?.color)}</span>
              </div>
              <div className={styles.sentMetaTime}>
                {inv.payload?.scheduledTime
                  ? new Date(inv.payload.scheduledTime).toLocaleString(undefined, {
                      month: "short", day: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })
                  : "—"}
              </div>
            </div>
            <span className={`${styles.statusBadge} ${statusClass(inv.status)}`}>
              {inv.status === "PENDING" ? "Waiting" : inv.status}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
