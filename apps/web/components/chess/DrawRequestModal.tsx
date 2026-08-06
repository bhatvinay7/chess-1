"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";
import styles from "./DrawRequestModal.module.css";
import type { OfferDrawPayload } from "@repo/socket-types";

const DEFAULT_AVATAR = "/defaultUser.jpg";

interface DrawRequestModalProps {
  offer: OfferDrawPayload;
  onAccept: () => void;
  onDecline: () => void;
}

export function DrawRequestModal({ offer, onAccept, onDecline }: DrawRequestModalProps) {
  const src = offer.profile_image_url || DEFAULT_AVATAR;

  return (
    <AnimatePresence>
      <motion.div
        className={styles.backdrop}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
      >
        <motion.div
          className={styles.modal}
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          role="alertdialog"
          aria-modal="true"
          aria-label="Draw offer"
        >
          <div className={styles.header}>
            <h1 className={styles.headerTitle}>Draw Offer</h1>
          </div>

          <div className={styles.body}>
            <div className={styles.avatarImg}>
              <img src={src} alt={offer.username} crossOrigin="anonymous" />
            </div>
            <p className={styles.offerText}>{offer.username} offers a draw</p>
            <p className={styles.offerSubtext}>{offer.message}</p>

            <div className={styles.actions}>
              <button className={styles.btnAccept} onClick={onAccept} type="button">
                <Check size={16} />
                Accept
              </button>
              <button className={styles.btnDecline} onClick={onDecline} type="button">
                <X size={16} />
                Decline
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default DrawRequestModal;
