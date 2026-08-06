"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { UserSearchResult } from "../../app/lib/api/users";
import styles from "./UserMiniCard.module.css";

const DEFAULT_AVATAR = "/defaultUser.jpg";

interface UserMiniCardProps {
  user: UserSearchResult;
  children?: ReactNode;
  subtitle?: string;
}

export function UserMiniCard({ user, children, subtitle }: UserMiniCardProps) {
  const totalGames = user.wins + user.losses + user.draws;

  return (
    <article className={styles.userCard}>
      <Link href={`/users/${user.id}`} className={styles.userLink}>
        <img
          src={user.profileImageUrl || DEFAULT_AVATAR}
          alt=""
          className={styles.avatar}
          crossOrigin="anonymous"
        />
        <div className={styles.userMeta}>
          <span className={styles.userName}>{user.username}</span>
          <span className={styles.userStats}>
            {subtitle ?? `${user.rating} ELO · ${totalGames} games`}
          </span>
        </div>
      </Link>
      {children && <div className={styles.actions}>{children}</div>}
    </article>
  );
}
