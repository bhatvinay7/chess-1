"use client";

import { Check, Loader2, UserRoundCheck, X } from "lucide-react";
import {
  useAcceptFriendRequest,
  useFriends,
  useIncomingFriendRequests,
  useRejectFriendRequest,
} from "../../hooks/useFriends";
import styles from "./shared.module.css";
import { UserMiniCard } from "./UserMiniCard";

export function FriendsPanel({ compact = false }: { compact?: boolean }) {
  const friends = useFriends();
  const incoming = useIncomingFriendRequests();
  const acceptRequest = useAcceptFriendRequest();
  const rejectRequest = useRejectFriendRequest();

  const friendItems = compact
    ? (friends.data ?? []).slice(0, 4)
    : (friends.data ?? []);
  const incomingItems = compact
    ? (incoming.data ?? []).slice(0, 3)
    : (incoming.data ?? []);

  return (
    <div className={styles.stack}>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>
            <UserRoundCheck size={16} /> Incoming requests
          </span>
          <span className={styles.count}>{incoming.data?.length ?? 0}</span>
        </div>

        {incoming.isLoading && (
          <div className={styles.empty}>
            <Loader2 size={16} /> Loading requests
          </div>
        )}
        {!incoming.isLoading && incomingItems.length === 0 && (
          <div className={styles.empty}>No incoming friend requests.</div>
        )}
        <div className={styles.list}>
          {incomingItems.map((request) => (
            <UserMiniCard
              key={request.id}
              user={request.user}
              subtitle="Wants to be friends"
            >
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={() => acceptRequest.mutate(request.id)}
                disabled={acceptRequest.isPending}
              >
                <Check size={14} /> Accept
              </button>
              <button
                type="button"
                className={styles.ghostBtn}
                onClick={() => rejectRequest.mutate(request.id)}
                disabled={rejectRequest.isPending}
              >
                <X size={14} />
              </button>
            </UserMiniCard>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>
            <UserRoundCheck size={16} /> Friends
          </span>
          <span className={styles.count}>{friends.data?.length ?? 0}</span>
        </div>

        {friends.isLoading && (
          <div className={styles.empty}>
            <Loader2 size={16} /> Loading friends
          </div>
        )}
        {!friends.isLoading && friendItems.length === 0 && (
          <div className={styles.empty}>Accepted friends will appear here.</div>
        )}
        <div className={styles.list}>
          {friendItems.map((friend) => (
            <UserMiniCard key={friend.id} user={friend.user} />
          ))}
        </div>
      </section>
    </div>
  );
}
