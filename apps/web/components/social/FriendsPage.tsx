"use client";

import { useState } from "react";
import { Clock3, Search, Send, Users } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useOutgoingFriendRequests } from "../../hooks/useFriends";
import { useUserSearch } from "../../hooks/useUsers";
import { FriendActionButton } from "./FriendActionButton";
import { FriendsPanel } from "./FriendsPanel";
import pageStyles from "./FriendsPage.module.css";
import sharedStyles from "./shared.module.css";
import { UserMiniCard } from "./UserMiniCard";

const styles = { ...pageStyles, ...sharedStyles };

export default function FriendsPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const search = useUserSearch(query);
  const outgoing = useOutgoingFriendRequests();

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Social</p>
          <h1 className={styles.title}>Friends</h1>
        </div>
        <div className={styles.summary}>
          {user ? `Signed in as ${user.username}` : "Sign in to manage friends"}
        </div>
      </header>

      <div className={styles.grid}>
        <div className={styles.stack}>
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}><Search size={16} /> Find players</span>
            </div>
            <label className={styles.searchBox}>
              <Search size={16} />
              <input
                className={styles.searchInput}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by username"
              />
            </label>

            <div className={styles.list} style={{ marginTop: "0.75rem" }}>
              {query.trim().length < 2 && (
                <div className={styles.empty}>Type at least 2 characters to search players.</div>
              )}
              {query.trim().length >= 2 && search.isLoading && (
                <div className={styles.empty}>Searching players...</div>
              )}
              {query.trim().length >= 2 && !search.isLoading && (search.data ?? []).length === 0 && (
                <div className={styles.empty}>No matching players found.</div>
              )}
              {(search.data ?? []).map((result) => (
                <UserMiniCard key={result.id} user={result}>
                  <FriendActionButton userId={result.id} status={result.friendshipStatus} />
                </UserMiniCard>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}><Send size={16} /> Sent requests</span>
              <span className={styles.count}>{outgoing.data?.length ?? 0}</span>
            </div>

            {(outgoing.data ?? []).length === 0 && !outgoing.isLoading && (
              <div className={styles.empty}>No outgoing requests.</div>
            )}
            <div className={styles.list}>
              {(outgoing.data ?? []).map((request) => (
                <UserMiniCard key={request.id} user={request.user}>
                  <span className={styles.statusPill}><Clock3 size={14} /> Pending</span>
                </UserMiniCard>
              ))}
            </div>
          </section>
        </div>

        <div className={styles.stack}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}><Users size={16} /> Network</span>
          </div>
          <FriendsPanel />
        </div>
      </div>
    </main>
  );
}
