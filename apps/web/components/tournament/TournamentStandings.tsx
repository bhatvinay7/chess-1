"use client";

import { useState } from "react";
import type { TournamentSocketData, GroupStanding, RoundStanding } from "../../app/lib/api/tournaments";
import styles from "./TournamentStandings.module.css";

interface Props {
  liveData:    TournamentSocketData | null;
  userId?:     string;
  accentColor: string;
  isActive:    boolean;
}

const MEDALS = ["🥇", "🥈", "🥉"];

function fmtScore(n: number) {
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

function Avatar({ username, img }: { username: string; img?: string | null }) {
  return (
    <span className={styles.avatar}>
      {img ? <img src={img} alt={username} /> : username[0]?.toUpperCase()}
    </span>
  );
}

// ── Group standings table (chess.com row style) ───────────────────────────

function GroupTable({
  group,
  userId,
  accentColor,
}: {
  group: GroupStanding;
  userId?: string;
  accentColor: string;
}) {
  const sorted = [...group.standings].sort((a, b) => b.score - a.score);
  const maxScore = Math.max(...sorted.map(p => p.score), 1);

  return (
    <div className={styles.groupBlock}>
      <div className={styles.groupHead}>
        <span className={styles.groupHeadLabel}>Group {group.groupNumber}</span>
        <span className={styles.groupHeadCount}>{sorted.length} players</span>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.thRank}>#</th>
            <th className={styles.thPlayer}>Player</th>
            <th className={`${styles.thNum} ${styles.thScore}`}>Pts</th>
            <th className={styles.thNum}>W</th>
            <th className={styles.thNum}>D</th>
            <th className={styles.thNum}>L</th>
            <th className={styles.thBar} />
          </tr>
        </thead>
        <tbody>
          {sorted.map((p, i) => {
            const isMe = p.playerId === userId;
            return (
              <tr
                key={p.playerId}
                className={`${styles.tr} ${isMe ? styles.trMe : ""}`}
                style={isMe ? { "--ac": accentColor } as React.CSSProperties : undefined}
              >
                <td className={styles.tdRank}>
                  {i < 3
                    ? <span className={styles.medal}>{MEDALS[i]}</span>
                    : <span className={styles.rankNum}>{i + 1}</span>
                  }
                </td>
                <td className={styles.tdPlayer}>
                  <span className={styles.playerInfo}>
                    <span className={styles.playerName}>{p.username}</span>
                    {p.byes > 0 && <span className={styles.byePill}>BYE</span>}
                  </span>
                </td>
                <td className={`${styles.tdNum} ${styles.tdScore}`}
                    style={isMe ? { color: accentColor } : undefined}>
                  {fmtScore(p.score)}
                </td>
                <td className={`${styles.tdNum} ${styles.tdW}`}>{p.wins}</td>
                <td className={`${styles.tdNum} ${styles.tdD}`}>{p.draws}</td>
                <td className={`${styles.tdNum} ${styles.tdL}`}>{p.losses}</td>
                <td className={styles.tdBar}>
                  <div className={styles.barTrack}>
                    <div
                      className={styles.barFill}
                      style={{
                        width: `${maxScore > 0 ? (p.score / maxScore) * 100 : 0}%`,
                        background: isMe ? accentColor : "rgba(255,255,255,0.15)",
                      }}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={7} className={styles.emptyCell}>No results yet</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Round-level leaderboard (after groups complete) ───────────────────────

function RoundLeaderboard({
  standings,
  userId,
  accentColor,
}: {
  standings: RoundStanding["roundStandings"];
  userId?:   string;
  accentColor: string;
}) {
  if (!standings.length) return null;

  return (
    <div className={styles.groupBlock}>
      <div className={styles.groupHead}>
        <span className={styles.groupHeadLabel}>Advanced</span>
        <span className={styles.groupHeadCount}>{standings.length} players</span>
      </div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.thRank}>#</th>
            <th className={styles.thPlayer}>Player</th>
            <th className={`${styles.thNum} ${styles.thScore}`}>Pts</th>
            <th className={styles.thNum}>Grp</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((p, i) => {
            const isMe = p.playerId === userId;
            return (
              <tr
                key={p.playerId}
                className={`${styles.tr} ${isMe ? styles.trMe : ""}`}
                style={isMe ? { "--ac": accentColor } as React.CSSProperties : undefined}
              >
                <td className={styles.tdRank}>
                  {i < 3
                    ? <span className={styles.medal}>{MEDALS[i]}</span>
                    : <span className={styles.rankNum}>{i + 1}</span>
                  }
                </td>
                <td className={styles.tdPlayer}>
                  <span className={styles.playerName}>{p.username}</span>
                </td>
                <td className={`${styles.tdNum} ${styles.tdScore}`}
                    style={isMe ? { color: accentColor } : undefined}>
                  {fmtScore(p.groupScore)}
                </td>
                <td className={styles.tdNum}>#{p.groupRank}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main standings component ──────────────────────────────────────────────

export default function TournamentStandings({ liveData, userId, accentColor, isActive }: Props) {
  const [activeRound, setActiveRound] = useState(0);

  if (!liveData || !liveData.rounds.length) {
    return (
      <div className={styles.empty}>
        <span>Standings will appear once games begin</span>
      </div>
    );
  }

  const round = liveData.rounds[activeRound];

  return (
    <div className={styles.wrap}>
      {/* Round selector */}
      {liveData.rounds.length > 1 && (
        <div className={styles.roundTabs}>
          {liveData.rounds.map((r, i) => (
            <button
              key={r.roundId}
              type="button"
              className={`${styles.roundTab} ${i === activeRound ? styles.roundTabActive : ""}`}
              onClick={() => setActiveRound(i)}
              style={i === activeRound ? { borderBottomColor: accentColor, color: accentColor } : undefined}
            >
              Round {r.roundNumber}
            </button>
          ))}
        </div>
      )}

      {round && (
        <div className={styles.content}>
          {/* Group standings */}
          <div className={styles.groupsWrap}>
            {round.groups.map(g => (
              <GroupTable
                key={g.groupId}
                group={g}
                userId={userId}
                accentColor={accentColor}
              />
            ))}
          </div>

          {/* Round advancement leaderboard */}
          {round.roundStandings.length > 0 && (
            <div className={styles.leaderboardWrap}>
              <h3 className={styles.leaderboardTitle}>
                Round {round.roundNumber} — Leaderboard
              </h3>
              <RoundLeaderboard
                standings={round.roundStandings}
                userId={userId}
                accentColor={accentColor}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
