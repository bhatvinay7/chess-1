"use client";

import { Check, Clock3, UserPlus, Users } from "lucide-react";
import type { FriendshipStatus } from "../../app/lib/api/users";
import { useSendFriendRequest } from "../../hooks/useFriends";
import styles from "./FriendActionButton.module.css";

interface FriendActionButtonProps {
  userId: string;
  status?: FriendshipStatus;
  onSent?: () => void;
}

export function FriendActionButton({ userId, status = "NONE", onSent }: FriendActionButtonProps) {
  const sendRequest = useSendFriendRequest();

  if (status === "SELF") {
    return <span className={styles.statusPill}><Users size={14} /> Your profile</span>;
  }

  if (status === "FRIENDS") {
    return <span className={styles.statusPill}><Check size={14} /> Friends</span>;
  }

  if (status === "OUTGOING_REQUEST") {
    return <span className={styles.statusPill}><Clock3 size={14} /> Pending</span>;
  }

  if (status === "INCOMING_REQUEST") {
    return <span className={styles.statusPill}><Clock3 size={14} /> Incoming</span>;
  }

  return (
    <button
      type="button"
      className={styles.primaryBtn}
      onClick={() => sendRequest.mutate(userId, { onSuccess: onSent })}
      disabled={sendRequest.isPending}
    >
      <UserPlus size={14} />
      {sendRequest.isPending ? "Sending" : "Add"}
    </button>
  );
}
