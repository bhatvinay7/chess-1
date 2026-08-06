"use client";

import { Users, Clock, Trophy, Star, Globe, Lock, Shield, CalendarDays } from "lucide-react";
import type { TournamentListItem } from "./types";
import { TOURNAMENT_TYPE_CONFIGS } from "./TournamentTypesSidebar";
import styles from "./TournamentOverview.module.css";

interface Props {
  tournament: TournamentListItem;
  accentColor: string;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowIcon}>{icon}</span>
      <span className={styles.rowLabel}>{label}</span>
      <span className={styles.rowValue}>{value}</span>
    </div>
  );
}

export default function TournamentOverview({ tournament: t, accentColor }: Props) {
  const typeConfig = TOURNAMENT_TYPE_CONFIGS.find((c) => c.id === t.tournamentType);

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Tournament Info</h2>
        <div className={styles.rows}>
          <Row icon={<Users size={14} />}      label="Players"              value={`${t.participantCount}${t.maxPlayers ? ` / ${t.maxPlayers}` : ""}`} />
          <Row icon={<Trophy size={14} />}     label="Format"               value={typeConfig?.label ?? t.tournamentType} />
          <Row icon={<CalendarDays size={14}/>} label="Starts"              value={fmt(t.timeManagement.startTime)} />
          <Row icon={<Clock size={14} />}      label="Registration Opens"   value={fmt(t.timeManagement.registrationOpenAt)} />
          <Row icon={<Clock size={14} />}      label="Registration Closes"  value={fmt(t.timeManagement.registrationCloseAt)} />
          {t.timeManagement.endTime && (
            <Row icon={<Clock size={14} />}    label="Ends"                 value={fmt(t.timeManagement.endTime)} />
          )}
          <Row icon={<Star size={14} />}       label="Rated"                value={t.isRated ? "Yes" : "No"} />
          <Row icon={<Globe size={14} />}      label="Access"               value={t.accessType} />
          {t.minRating != null && <Row icon={<Shield size={14} />} label="Min Rating" value={t.minRating} />}
          {t.maxRating != null && <Row icon={<Shield size={14} />} label="Max Rating" value={t.maxRating} />}
          {t.inviteOnly   && <Row icon={<Lock size={14} />}   label="Invite Only"   value="Yes" />}
          {t.premiumOnly  && <Row icon={<Shield size={14} />} label="Premium Only"  value="Yes" />}
          {t.timeControl  && <Row icon={<Clock size={14} />}  label="Time Control"  value={t.timeControl.label} />}
        </div>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Organizer</h2>
        <div className={styles.creatorRow}>
          <div className={styles.creatorAvatar} style={{ borderColor: `${accentColor}44` }}>
            {t.creator.profileImageUrl
              ? <img src={t.creator.profileImageUrl} alt={t.creator.username} />
              : <span style={{ color: accentColor }}>{t.creator.username[0]?.toUpperCase()}</span>
            }
          </div>
          <span className={styles.creatorName}>{t.creator.username}</span>
        </div>
      </div>
    </div>
  );
}
