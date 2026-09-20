"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  History,
  Trophy,
  UserRound,
} from "lucide-react";
import { useUserGameHistory } from "../../hooks/useGameHistory";
import { usePublicUserProfile } from "../../hooks/useUsers";
import { GameHistoryList } from "../history/GameHistoryList";
import { FriendActionButton } from "./FriendActionButton";
import profileStyles from "./PublicUserProfilePage.module.css";
import sharedStyles from "./shared.module.css";

const styles = { ...profileStyles, ...sharedStyles };

const DEFAULT_AVATAR = "/defaultUser.jpg";
const PAGE_SIZE = 6;

function formatJoinDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

function winRate(wins: number, losses: number): string {
  const total = wins + losses;
  if (total === 0) return "0%";
  return `${Math.round((wins / total) * 100)}%`;
}

export default function PublicUserProfilePage() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId;
  const [page, setPage] = useState(1);

  const profile = usePublicUserProfile(userId);
  const history = useUserGameHistory(userId, page, PAGE_SIZE);

  if (profile.isLoading) {
    return (
      <main className={styles.container}>
        <div className={styles.message}>Loading profile...</div>
      </main>
    );
  }

  if (profile.error || !profile.data) {
    return (
      <main className={styles.container}>
        <div className={styles.message}>Could not load this profile.</div>
      </main>
    );
  }

  const totalGames =
    profile.data.wins + profile.data.losses + profile.data.draws;
  const games = history.data?.games ?? [];
  const totalPages = history.data?.totalPages ?? 1;

  return (
    <main className={styles.container}>
      <section className={styles.profileHero}>
        <div className={styles.profileMain}>
          <img
            src={profile.data.profileImageUrl || DEFAULT_AVATAR}
            alt=""
            className={styles.profileAvatar}
            crossOrigin="anonymous"
          />
          <div>
            <p className={styles.kicker}>Player profile</p>
            <h1 className={styles.profileName}>{profile.data.username}</h1>
            <div className={styles.metaRow}>
              <span>Joined {formatJoinDate(profile.data.createdAt)}</span>
              <span>{totalGames} games</span>
              <span>{profile.data.rating} ELO</span>
            </div>
          </div>
        </div>
        <FriendActionButton
          userId={profile.data.id}
          status={profile.data.friendshipStatus}
          onSent={() => profile.refetch()}
        />
      </section>

      <section className={styles.statsGrid}>
        <div className={styles.stat}>
          <span>Rating</span>
          <strong>{profile.data.rating}</strong>
        </div>
        <div className={styles.stat}>
          <span>Record</span>
          <strong>
            {profile.data.wins}W {profile.data.losses}L {profile.data.draws}D
          </strong>
        </div>
        <div className={styles.stat}>
          <span>Win rate</span>
          <strong>{winRate(profile.data.wins, profile.data.losses)}</strong>
        </div>
        <div className={styles.stat}>
          <span>Total games</span>
          <strong>{totalGames}</strong>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>
            <History size={16} /> Game history
          </span>
          <span className={styles.count}>{history.data?.total ?? 0} games</span>
        </div>

        {history.isLoading && (
          <div className={styles.empty}>Loading games...</div>
        )}
        {!history.isLoading && games.length === 0 && (
          <div className={styles.empty}>
            <Trophy size={16} /> No completed games yet.
          </div>
        )}
        {!history.isLoading && games.length > 0 && (
          <div
            style={{
              opacity: history.isFetching ? 0.55 : 1,
              transition: "opacity 0.15s",
            }}
          >
            <GameHistoryList
              games={games}
              showReviewActions={false}
              playerTag="Player"
            />
            {totalPages > 1 && (
              <div
                className={styles.sectionHeader}
                style={{ marginTop: "1rem", marginBottom: 0 }}
              >
                <span className={styles.count}>
                  Page {page} of {totalPages}
                </span>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
                    disabled={page === 1 || history.isFetching}
                  >
                    <ChevronLeft size={14} /> Prev
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() =>
                      setPage((current) => Math.min(totalPages, current + 1))
                    }
                    disabled={page === totalPages || history.isFetching}
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <section className={styles.section} style={{ marginTop: "1rem" }}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>
            <UserRound size={16} /> About
          </span>
        </div>
        <div className={styles.empty}>
          Public profile details are limited to chess stats and game history.
        </div>
      </section>
    </main>
  );
}
