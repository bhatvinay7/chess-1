"use client";

import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";
import { useRouter } from "next/navigation";
import { useNotifications, type Notification } from "../../hooks/useInvites";
import inviteStyles from "../invite/invite.module.css";
import styles from "./Notifications.module.css";
import { motion, AnimatePresence, type Variants } from "framer-motion";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

export default function NotificationsPage() {
  const darkUI = useSelector((s: RootState) => s.sidebar.darkUI);
  const router = useRouter();
  const {
    notifications,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  useEffect(() => {
    fetchNotifications();
    if (darkUI) {
      document.body.classList.add("dark-ui");
    } else {
      document.body.classList.remove("dark-ui");
    }
  }, [fetchNotifications, darkUI]);

  const handleNotificationClick = (n: Notification) => {
    if (!n.isRead) {
      markAsRead(n.id);
    }

    if (n.type === "GAME_INVITATION") {
      router.push("/arena/invite/received");
    } else if (n.metadata?.url) {
      router.push(n.metadata.url);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`${inviteStyles.page} ${styles.container}`}
    >
      <div className={inviteStyles.header}>
        <div className={inviteStyles.headerTitle}>
          <span>🔔</span> Notifications
        </div>
        <button
          type="button"
          onClick={markAllAsRead}
          className={`${inviteStyles.markAllBtn} ${styles.markAllBtn}`}
        >
          Mark all as read
        </button>
      </div>

      <div>
        {loading ? (
          <div className={inviteStyles.loadingWrap}>
            <div className={inviteStyles.spinner} />
            <span className={styles.loadingText}>
              Loading notifications...
            </span>
          </div>
        ) : notifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={inviteStyles.emptyState}
          >
            <span className={inviteStyles.emptyIcon}>📭</span>
            <span className={inviteStyles.emptyTitle}>
              No notifications yet
            </span>
          </motion.div>
        ) : (
          <motion.div
            className={inviteStyles.cardList}
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            <AnimatePresence>
              {notifications.map((n) => {
                const isInvite = n.type === "GAME_INVITATION";
                return (
                  <motion.div
                    key={n.id}
                    variants={itemVariants}
                    layout
                    whileHover={{ scale: 1.01, y: -2 }}
                    className={`${inviteStyles.notifCard} ${
                      !n.isRead ? inviteStyles.notifCardUnread : ""
                    }`}
                    onClick={() => handleNotificationClick(n)}
                  >
                    <div className={inviteStyles.notifIcon}>
                      {n.type === "GAME_INVITATION" && "⚔"}
                      {n.type === "GAME_INVITATION_ACCEPTED" && "✅"}
                      {n.type === "GAME_INVITATION_REJECTED" && "❌"}
                      {n.type === "GAME_START" && "♟"}
                      {![
                        "GAME_INVITATION",
                        "GAME_INVITATION_ACCEPTED",
                        "GAME_INVITATION_REJECTED",
                        "GAME_START",
                      ].includes(n.type) && "🔔"}
                    </div>
                    <div className={inviteStyles.notifMeta}>
                      <div
                        className={`${inviteStyles.notifMsg} ${styles.msgText}`}
                        style={{ fontWeight: n.isRead ? 500 : 700 }}
                      >
                        {n.message}
                      </div>
                      <div className={inviteStyles.notifTime}>
                        {new Date(n.createdAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    {isInvite && (
                      <span className={inviteStyles.notifAction}>
                        View Challenge →
                      </span>
                    )}
                    {n.metadata?.url &&
                      n.type === "GAME_INVITATION_ACCEPTED" && (
                        <span className={inviteStyles.notifAction}>
                          Join Game →
                        </span>
                      )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
