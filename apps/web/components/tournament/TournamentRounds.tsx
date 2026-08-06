"use client";

import { useState } from "react";
import { RefreshCw, Clock, Wifi } from "lucide-react";
import {
  useTournamentRounds,
  type UnifiedGroup,
  type UnifiedRound,
  type UnifiedPlayerRow,
  type UnifiedMatch,
} from "../../hooks/useTournamentRounds";
import type { TournamentSocketData } from "../../app/lib/api/tournaments";
import styles from "./TournamentRounds.module.css";

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  tournamentId: string;
  accentColor:  string;
  active:       boolean;
  liveData:     TournamentSocketData | null;
  isLive:       boolean;
  userId?:      string;
}

// ── Formatters ────────────────────────────────────────────────────────────────

const TERMINAL = new Set(["WHITE_WIN", "BLACK_WIN", "DRAW", "ABANDONED"]);
const IN_PROGRESS_STATES = new Set(["IN_PROGRESS", "ACTIVE"]);

function gameResult(state: string, white: { id: string } | null, black: { id: string } | null, winnerId: string | null): string {
  if (state === "WHITE_WIN")  return "1 – 0";
  if (state === "BLACK_WIN")  return "0 – 1";
  if (state === "DRAW")       return "½ – ½";
  if (state === "ABANDONED")  return "ABN";
  return "· · ·";
}

function fmtScore(n: number) {
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

function scheduledTime(ms: number | null): string {
  if (!ms) return "";
  return new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

const MEDALS = ["🥇", "🥈", "🥉"];

// ── MatchRow ──────────────────────────────────────────────────────────────────

function MatchRow({ match, accentColor, userId }: {
  match:       UnifiedMatch;
  accentColor: string;
  userId?:     string;
}) {
  const isLive = IN_PROGRESS_STATES.has(match.gameState);
  const isDone = TERMINAL.has(match.gameState);
  const isMine = match.white?.id === userId || match.black?.id === userId;

  return (
    <div
      className={`${styles.matchRow} ${isLive ? styles.matchLive : ""} ${isMine ? styles.matchMine : ""}`}
      style={isMine ? { "--ac": accentColor } as React.CSSProperties : undefined}
    >
      {/* White player */}
      <div className={styles.matchSide}>
        <span className={`${styles.colorPip} ${styles.pipWhite}`} />
        <span className={`${styles.matchName} ${match.white?.id === userId ? styles.matchNameMe : ""}`}>
          {match.white?.username ?? "—"}
        </span>
      </div>

      {/* Result / live badge */}
      <div className={`${styles.matchScore} ${isLive ? styles.matchScoreLive : isDone ? styles.matchScoreDone : styles.matchScorePending}`}>
        {isLive
          ? <><span className={styles.livePip} style={{ background: accentColor }} />Live</>
          : isDone
          ? gameResult(match.gameState, match.white, match.black, match.winnerId)
          : match.scheduledStartMs
          ? <><Clock size={9} />{scheduledTime(match.scheduledStartMs)}</>
          : "–"
        }
      </div>

      {/* Black player */}
      <div className={`${styles.matchSide} ${styles.matchSideRight}`}>
        <span className={`${styles.matchName} ${match.black?.id === userId ? styles.matchNameMe : ""}`}>
          {match.black?.username ?? "BYE"}
        </span>
        <span className={`${styles.colorPip} ${styles.pipBlack}`} />
      </div>
    </div>
  );
}

// ── StandingsTable ────────────────────────────────────────────────────────────

function StandingsTable({ standings, userId, accentColor, isComplete }: {
  standings:   UnifiedPlayerRow[];
  userId?:     string;
  accentColor: string;
  isComplete:  boolean;
}) {
  if (!standings.length) return null;
  const maxScore = Math.max(...standings.map(p => p.score), 0.5);

  return (
    <table className={styles.standTable}>
      <thead>
        <tr className={styles.standHead}>
          <th className={styles.thRank}>#</th>
          <th className={styles.thPlayer}>Player</th>
          <th className={styles.thNum}>Pts</th>
          <th className={styles.thNum}>W</th>
          <th className={styles.thNum}>D</th>
          <th className={styles.thNum}>L</th>
          <th className={styles.thBar} />
        </tr>
      </thead>
      <tbody>
        {standings.map((p, i) => {
          const isMe = p.playerId === userId;
          return (
            <tr
              key={p.playerId}
              className={`${styles.standRow} ${isMe ? styles.standRowMe : ""} ${isComplete && i === 0 ? styles.standRowFirst : ""}`}
              style={isMe ? { "--ac": accentColor } as React.CSSProperties : undefined}
            >
              <td className={styles.tdRank}>
                {isComplete && i < 3
                  ? <span className={styles.medal}>{MEDALS[i]}</span>
                  : <span className={styles.rankNum}>{i + 1}</span>
                }
              </td>
              <td className={styles.tdPlayer}>
                <span className={`${styles.standName} ${isMe ? styles.standNameMe : ""}`}
                      style={isMe ? { color: accentColor } : undefined}>
                  {p.username}
                </span>
                {p.byes > 0 && <span className={styles.byePill}>BYE</span>}
              </td>
              <td className={`${styles.tdNum} ${styles.tdScore}`}
                  style={isMe ? { color: accentColor, fontWeight: 700 } : undefined}>
                {fmtScore(p.score)}
              </td>
              <td className={`${styles.tdNum} ${styles.tdW}`}>{p.wins}</td>
              <td className={`${styles.tdNum} ${styles.tdD}`}>{p.draws}</td>
              <td className={`${styles.tdNum} ${styles.tdL}`}>{p.losses}</td>
              <td className={styles.tdBar}>
                <div className={styles.barTrack}>
                  <div className={styles.barFill}
                       style={{
                         width: `${(p.score / maxScore) * 100}%`,
                         background: isMe ? accentColor : undefined,
                       }} />
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ── GroupPanel ────────────────────────────────────────────────────────────────

function GroupPanel({ group, accentColor, userId }: {
  group:       UnifiedGroup;
  accentColor: string;
  userId?:     string;
}) {
  const done  = group.matches.filter(m => TERMINAL.has(m.gameState)).length;
  const live  = group.matches.filter(m => IN_PROGRESS_STATES.has(m.gameState)).length;
  const total = group.matches.length;

  return (
    <div className={`${styles.groupPanel} ${group.isComplete ? styles.groupDone : ""}`}>
      {/* Group header */}
      <div className={styles.groupHeader}>
        <span className={styles.groupLabel}>Group {group.groupNumber}</span>
        <div className={styles.groupMeta}>
          {live > 0 && (
            <span className={styles.liveChip} style={{ color: accentColor }}>
              <span className={styles.livePip} style={{ background: accentColor }} />
              {live} live
            </span>
          )}
          <span className={styles.progressChip}>
            {done}/{total} done
          </span>
          {group.isComplete && <span className={styles.doneChip}>✓ Complete</span>}
        </div>
      </div>

      {/* Live standings — visible as soon as any game starts */}
      {group.standings.length > 0 && (
        <div className={styles.standingsSection}>
          <StandingsTable
            standings={group.standings}
            userId={userId}
            accentColor={accentColor}
            isComplete={group.isComplete}
          />
        </div>
      )}

      {/* Match list */}
      <div className={styles.matchSection}>
        <span className={styles.matchSectionLabel}>Games</span>
        <div className={styles.matchList}>
          {group.matches.length === 0
            ? <span className={styles.noMatches}>No games scheduled</span>
            : group.matches.map(m => (
                <MatchRow
                  key={m.matchId}
                  match={m}
                  accentColor={accentColor}
                  userId={userId}
                />
              ))
          }
        </div>
      </div>
    </div>
  );
}

// ── RoundStandingsPanel ───────────────────────────────────────────────────────

function RoundStandingsPanel({ round, accentColor, userId }: {
  round:       UnifiedRound;
  accentColor: string;
  userId?:     string;
}) {
  if (!round.roundStandings.length) return null;

  return (
    <div className={styles.roundStandPanel}>
      <div className={styles.roundStandHeader}>
        <Trophy size={13} />
        <span>Round {round.roundNumber} — Final Standings</span>
      </div>
      <table className={styles.standTable}>
        <thead>
          <tr className={styles.standHead}>
            <th className={styles.thRank}>#</th>
            <th className={styles.thPlayer}>Player</th>
            <th className={styles.thNum}>Pts</th>
            <th className={styles.thNum}>Group rank</th>
          </tr>
        </thead>
        <tbody>
          {round.roundStandings
            .sort((a, b) => b.groupScore - a.groupScore || a.groupRank - b.groupRank)
            .map((p, i) => {
              const isMe = p.playerId === userId;
              return (
                <tr key={p.playerId}
                    className={`${styles.standRow} ${isMe ? styles.standRowMe : ""}`}
                    style={isMe ? { "--ac": accentColor } as React.CSSProperties : undefined}>
                  <td className={styles.tdRank}>
                    {i < 3 ? <span className={styles.medal}>{MEDALS[i]}</span> : <span className={styles.rankNum}>{i + 1}</span>}
                  </td>
                  <td className={styles.tdPlayer}>
                    <span className={`${styles.standName} ${isMe ? styles.standNameMe : ""}`}
                          style={isMe ? { color: accentColor } : undefined}>
                      {p.username}
                    </span>
                  </td>
                  <td className={`${styles.tdNum} ${styles.tdScore}`}
                      style={isMe ? { color: accentColor, fontWeight: 700 } : undefined}>
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

// Import missing icon
import { Trophy } from "lucide-react";

// ── TournamentRounds (main) ───────────────────────────────────────────────────

export default function TournamentRounds({ tournamentId, accentColor, active, liveData, isLive, userId }: Props) {
  const [activeRound, setActiveRound] = useState(0);

  const { rounds, loading, source, refresh } = useTournamentRounds({
    tournamentId,
    liveData,
    isLive,
    active,
  });

  // Auto-select the latest round when data arrives
  const [didAutoSelect, setDidAutoSelect] = useState(false);
  if (rounds.length && !didAutoSelect) {
    setActiveRound(rounds.length - 1);
    setDidAutoSelect(true);
  }

  // ── Empty / loading states ───────────────────────────────────────────────

  if (loading && !rounds.length) {
    return (
      <div className={styles.loadingState}>
        <RefreshCw size={18} className={styles.spin} />
        <span>Loading rounds…</span>
      </div>
    );
  }

  if (!loading && !rounds.length) {
    return (
      <div className={styles.emptyState}>
        <Clock size={24} />
        <span>Rounds will appear once the tournament starts</span>
      </div>
    );
  }

  const round = rounds[activeRound];

  return (
    <div className={styles.wrap}>
      {/* Source badge + refresh */}
      <div className={styles.topBar}>
        <div className={styles.sourceBadge}>
          {source === "socket"
            ? <><Wifi size={11} style={{ color: accentColor }} /><span style={{ color: accentColor }}>Live</span></>
            : <><span className={styles.sourceDot} />From DB</>
          }
        </div>
        <button type="button" className={styles.refreshBtn} onClick={refresh} title="Refresh">
          <RefreshCw size={12} className={loading ? styles.spin : undefined} />
        </button>
      </div>

      {/* Round tabs */}
      <div className={styles.roundTabs}>
        {rounds.map((r, i) => (
          <button
            key={r.roundId}
            type="button"
            className={`${styles.roundTab} ${i === activeRound ? styles.roundTabActive : ""}`}
            onClick={() => setActiveRound(i)}
            style={i === activeRound ? { borderBottomColor: accentColor, color: accentColor } : undefined}
          >
            Round {r.roundNumber}
            {r.status === "COMPLETED"   && <span className={styles.roundDone}>✓</span>}
            {r.status === "IN_PROGRESS" && (
              <span className={styles.roundLivePip} style={{ background: accentColor }} />
            )}
          </button>
        ))}
      </div>

      {/* Active round content */}
      {round && (
        <>
          {/* Groups grid */}
          <div className={styles.groupsGrid}>
            {round.groups.map(g => (
              <GroupPanel
                key={g.groupId}
                group={g}
                accentColor={accentColor}
                userId={userId}
              />
            ))}
            {round.groups.length === 0 && (
              <div className={styles.emptyState}>
                <span>No groups in this round yet</span>
              </div>
            )}
          </div>

          {/* Round final standings (shown when round is complete) */}
          {round.status === "COMPLETED" && (
            <RoundStandingsPanel round={round} accentColor={accentColor} userId={userId} />
          )}
        </>
      )}
    </div>
  );
}
