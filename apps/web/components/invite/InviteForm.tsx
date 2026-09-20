"use client";

import React, { useState, useEffect } from "react";
import axio from "../../app/lib/axio";
import { useDebounce } from "../../hooks/useDebounce";
import styles from "./invite.module.css";

const TC_GROUPS = [
  { label: "Bullet", options: ["1+0", "2+1"] },
  { label: "Blitz", options: ["3+0", "3+2", "5+0", "5+3"] },
  { label: "Rapid", options: ["10+0", "15+10", "30+0"] },
];

const MODE_OPTIONS = [
  { value: "standard", emoji: "♟", label: "Standard" },
  { value: "chess960", emoji: "⚄", label: "Chess960" },
];

interface Props {
  onSend: (body: any) => Promise<void>;
  actionLoading: boolean;
  error: string | null;
}

export default function InviteForm({ onSend, actionLoading, error }: Props) {
  const [friends, setFriends] = useState<any[]>([]);
  const [friendSearch, setFriendSearch] = useState("");
  const debouncedFriendSearch = useDebounce(friendSearch, 300);
  const [selectedFriend, setSelectedFriend] = useState("");
  const [timeControl, setTimeControl] = useState("10+0");
  const [gameMode, setGameMode] = useState("standard");
  const [color, setColor] = useState("random");
  const [scheduledTime, setScheduledTime] = useState("");
  const [localError, setLocalError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchFriends();
  }, []);

  const fetchFriends = async () => {
    try {
      const res = await axio.get(`/friends`);
      if (res.data?.friends) {
        setFriends(res.data.friends);
      }
    } catch (err) {
      console.error("Failed to fetch friends", err);
    }
  };

  const handleSend = async () => {
    setLocalError("");
    setSuccess("");

    if (!selectedFriend) {
      setLocalError("Please select a friend to invite.");
      return;
    }
    if (!scheduledTime) {
      setLocalError("Please select a scheduled start time.");
      return;
    }

    try {
      await onSend({
        receiverId: selectedFriend,
        timeControl,
        gameMode,
        color,
        scheduledTime: new Date(scheduledTime).toISOString(),
      });
      setSuccess("Invitation sent successfully!");
      setScheduledTime("");
    } catch (err: any) {
      setLocalError(
        err.response?.data?.message || "Failed to send invitation.",
      );
    }
  };

  return (
    <div className={styles.panelBody}>
      {/* Alert */}
      {(error || localError) && (
        <div className={styles.alertError}>
          <span>⚠</span> {error || localError}
        </div>
      )}
      {success && (
        <div className={styles.alertSuccess}>
          <span>✓</span> {success}
        </div>
      )}

      {/* Opponent */}
      <div>
        <div className={styles.sectionLabel}>Opponent</div>
        <input
          type="text"
          placeholder="Search friends..."
          value={friendSearch}
          onChange={(e) => setFriendSearch(e.target.value)}
          className={styles.friendSearch}
        />
        <div className={styles.friendGrid}>
          {friends.length === 0 ? (
            <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}>
              No friends yet. Add friends first!
            </div>
          ) : debouncedFriendSearch.length === 0 && !selectedFriend ? (
            <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}>
              Type a username to search friends...
            </div>
          ) : (
            friends
              .filter((f) => {
                if (debouncedFriendSearch.length > 0) {
                  return f.user.username
                    .toLowerCase()
                    .includes(debouncedFriendSearch.toLowerCase());
                }
                return f.user.id === selectedFriend;
              })
              .map((f) => {
                const active = selectedFriend === f.user.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setSelectedFriend(f.user.id);
                      setFriendSearch(f.user.username);
                    }}
                    className={`${styles.friendChip} ${active ? styles.friendChipActive : ""}`}
                  >
                    <div className={styles.friendAvatar}>
                      {f.user.username.charAt(0).toUpperCase()}
                    </div>
                    {f.user.username}
                  </button>
                );
              })
          )}
        </div>
      </div>

      {/* Time Control */}
      <div>
        <div className={styles.sectionLabel}>Time Control</div>
        <div className={styles.tcGroups}>
          {TC_GROUPS.map((group) => (
            <div key={group.label}>
              <div className={styles.tcGroupHeader}>{group.label}</div>
              <div className={styles.tcRow}>
                {group.options.map((opt) => {
                  const active = timeControl === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setTimeControl(opt)}
                      className={`${styles.chip} ${active ? styles.chipActive : ""}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Game Mode */}
      <div>
        <div className={styles.sectionLabel}>Mode</div>
        <div className={styles.chipRow}>
          {MODE_OPTIONS.map((mode) => {
            const active = gameMode === mode.value;
            return (
              <button
                key={mode.value}
                type="button"
                onClick={() => setGameMode(mode.value)}
                className={`${styles.chip} ${active ? styles.chipActive : ""}`}
                style={{ flex: 1 }}
              >
                <span style={{ fontSize: "1rem", marginRight: "0.3rem" }}>
                  {mode.emoji}
                </span>
                {mode.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Play as */}
      <div>
        <div className={styles.sectionLabel}>Play as</div>
        <div className={styles.chipRowThree}>
          {[
            { value: "white", emoji: "⬜", label: "White" },
            { value: "random", emoji: "🎲", label: "Random" },
            { value: "black", emoji: "⬛", label: "Black" },
          ].map((c) => {
            const active = color === c.value;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                className={`${styles.chip} ${active ? styles.chipActive : ""}`}
              >
                <span style={{ fontSize: "1rem", marginRight: "0.3rem" }}>
                  {c.emoji}
                </span>
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Schedule */}
      <div>
        <div className={styles.sectionLabel}>Schedule Time</div>
        <input
          type="datetime-local"
          value={scheduledTime}
          onChange={(e) => setScheduledTime(e.target.value)}
          className={styles.dateInput}
        />
      </div>

      {/* Send */}
      <div className={styles.summaryBar}>
        <div className={styles.summaryText}>
          {timeControl} • {gameMode === "chess960" ? "Chess960" : "Standard"} •{" "}
          {color}
        </div>
        <button
          className={styles.sendBtn}
          onClick={handleSend}
          disabled={actionLoading || !selectedFriend || !scheduledTime}
        >
          {actionLoading ? "Sending..." : "Send Challenge 🚀"}
        </button>
      </div>
    </div>
  );
}
