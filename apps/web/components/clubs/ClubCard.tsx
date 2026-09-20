"use client";
import React from "react";
import Link from "next/link";
import { Users, Trophy } from "lucide-react";
import type { ClubListItem } from "../../types/club";
import styles from "./ClubCard.module.css";

interface Props {
  club: ClubListItem;
}

export default function ClubCard({ club }: Props) {
  return (
    <Link href={`/clubs/${club.id}`} className={styles.card}>
      <div className={styles.imageWrap}>
        <img src={club.imageUrl} alt={club.name} className={styles.image} />
      </div>
      <div className={styles.body}>
        <h3 className={styles.name}>{club.name}</h3>
        {club.description && <p className={styles.desc}>{club.description}</p>}
        <div className={styles.meta}>
          <span className={styles.metaItem}>
            <Users size={13} />
            {club._count.members} members
          </span>
          <span className={styles.metaItem}>
            <Trophy size={13} />
            {club._count.tournaments} tournaments
          </span>
        </div>
        <span className={styles.creator}>by {club.creator.username}</span>
      </div>
    </Link>
  );
}
