"use client";

import React from "react";
import type { Invite } from "../../hooks/useInvites";
import styles from "./invite.module.css";

interface Props {
  inv: Invite;
  onAccept?: () => void;
  onReject?: () => void;
  isLoading?: boolean;
}

const colorEmoji = (c?: string) =>
  c === "white" ? "⬜" : c === "black" ? "⬛" : "🎲";

export default function InviteCard({ inv, onAccept, onReject, isLoading }: Props) {
  const isPending = inv.status === "PENDING";
  const initial = inv.sender?.username?.charAt(0)?.toUpperCase() ?? inv.senderId?.charAt(0)?.toUpperCase() ?? "?";

  const statusClass =
    inv.status === "ACCEPTED" ? styles.statusAccepted :
    inv.status === "REJECTED" ? styles.statusRejected :
    styles.statusPending;

  const cardClass =
    inv.status === "ACCEPTED" ? styles.inviteCardAccepted :
    inv.status === "REJECTED" ? styles.inviteCardRejected :
    styles.inviteCardPending;

  return (
    <div className={`${styles.inviteCard} ${cardClass}`}>
      {/* Top row: avatar + sender info + status */}
      <div className={styles.cardTop}>
        <div className={styles.cardSender}>
          <div className={styles.cardAvatar}>{initial}</div>
          <div>
            <div className={styles.cardSenderName}>{inv.sender?.username || inv.senderId}</div>
            <div className={styles.cardSenderSub}>invited you to play</div>
          </div>
        </div>
        {!isPending && (
          <span className={`${styles.statusBadge} ${statusClass}`}>
            {inv.status}
          </span>
        )}
      </div>

      {/* Details chips */}
      <div className={styles.detailChips}>
        <div className={styles.detailChip}>
          {inv.payload?.gameMode === "chess960" ? "⚄ Chess960" : "♟ Standard"}
        </div>
        <div className={styles.detailChip}>
          ⏱ {inv.payload?.timeControl ?? "—"}
        </div>
        <div className={styles.detailChip}>
          {colorEmoji(inv.payload?.color)} Sender plays {inv.payload?.color ?? "?"}
        </div>
        {inv.payload?.scheduledTime && (
          <div className={styles.detailChip}>
            📅{" "}
            {new Date(inv.payload.scheduledTime).toLocaleString(undefined, {
              month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      {isPending && (
        <div className={styles.cardActions}>
          <button
            type="button"
            className={styles.acceptBtn}
            onClick={onAccept}
            disabled={isLoading}
          >
            {isLoading ? "…" : "✓ Accept"}
          </button>
          <button
            type="button"
            className={styles.rejectBtn}
            onClick={onReject}
            disabled={isLoading}
          >
            ✕ Decline
          </button>
        </div>
      )}
    </div>
  );
}
