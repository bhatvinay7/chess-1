"use client";

import React from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useClub } from "../../hooks/useClubs";
import ClubProfile from "./ClubProfile";
import styles from "./clubs.module.css";

export default function ClubDetailPage() {
  const { clubId } = useParams<{ clubId: string }>();
  const { data: club, isLoading, error } = useClub(clubId);

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Loader2 size={24} style={{ animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (error || !club) {
    return (
      <div className={styles.empty}>
        Club not found.
      </div>
    );
  }

  return <ClubProfile club={club} />;
}
