"use client";

import { useState, useEffect } from "react";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Swords,
  Users,
  Globe,
  RefreshCw,
  CalendarDays,
  Globe2,
} from "lucide-react";
import type {
  CreateTournamentPayload,
  TournamentType,
  ClubSummary,
} from "./types";
import {
  TIME_CONTROLS,
  DAILY_CONTROLS,
  TC_CATEGORY_LABELS,
  TC_CATEGORY_COLORS,
} from "../../app/lib/timeControls";
import { getMyAdminClubs, listClubs } from "../../app/lib/api/clubs";
import styles from "./CreateTournamentModal.module.css";

interface Props {
  onClose: () => void;
  onSubmit: (payload: CreateTournamentPayload) => Promise<void>;
  submitting?: boolean;
  defaultType?: TournamentType;
}

const TYPE_OPTIONS: {
  value: TournamentType;
  label: string;
  desc: string;
  icon: React.ReactNode;
  color: string;
  requiresAdmin: boolean;
}[] = [
  {
    value: "ARENA",
    label: "Arena",
    desc: "Timed free-for-all. Score as many points as possible.",
    icon: <Swords size={20} />,
    color: "#e85d5d",
    requiresAdmin: false,
  },
  {
    value: "CLUB_SWISS",
    label: "Club Swiss",
    desc: "Paired rounds for club members. Club admin only.",
    icon: <Users size={20} />,
    color: "#4b9de8",
    requiresAdmin: true,
  },
  {
    value: "GLOBAL_SWISS",
    label: "Global Swiss",
    desc: "Open Swiss tournament for all players worldwide.",
    icon: <Globe size={20} />,
    color: "#9b6fe8",
    requiresAdmin: false,
  },
  {
    value: "CLUB_ROUND_ROBIN",
    label: "Club Round Robin",
    desc: "Every club member plays each other once. Club admin only.",
    icon: <RefreshCw size={20} />,
    color: "#3ecf8e",
    requiresAdmin: true,
  },
  {
    value: "GLOBAL_ROUND_ROBIN",
    label: "Global Round Robin",
    desc: "World-open round robin — everyone plays everyone.",
    icon: <Globe2 size={20} />,
    color: "#06b6d4",
    requiresAdmin: false,
  },
  {
    value: "DAILY",
    label: "Daily",
    desc: "Correspondence chess. Days per move.",
    icon: <CalendarDays size={20} />,
    color: "#f59e0b",
    requiresAdmin: false,
  },
];

const STEPS = ["Format", "Details", "Schedule", "Settings"];

function toLocalISOString(date: Date) {
  const off = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - off).toISOString().slice(0, 16);
}

const nowPlus = (minutes: number) =>
  toLocalISOString(new Date(Date.now() + minutes * 60000));

function deriveAccess(
  type: TournamentType,
): "OPEN" | "CLUB" | "CROSS_CLUB" | "PRIVATE" {
  if (type === "CLUB_SWISS" || type === "CLUB_ROUND_ROBIN") return "CLUB";
  return "OPEN";
}

function deriveVisibility(
  accessType: "OPEN" | "CLUB" | "CROSS_CLUB" | "PRIVATE",
): "PUBLIC" | "PRIVATE" | "CLUB_ONLY" {
  if (accessType === "CLUB") return "CLUB_ONLY";
  if (accessType === "PRIVATE") return "PRIVATE";
  return "PUBLIC";
}

export default function CreateTournamentModal({
  onClose,
  onSubmit,
  submitting,
  defaultType,
}: Props) {
  const [step, setStep] = useState(defaultType ? 1 : 0);

  // Step 0 — Format
  const [tournamentType, setTournamentType] = useState<TournamentType>(
    defaultType ?? "ARENA",
  );

  // Step 1 — Details
  const [timeControlId, setTimeControlId] = useState<string>("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [gameType, setGameType] = useState<"STANDARD" | "CHESS960">("STANDARD");
  const [accessType, setAccessType] = useState<
    "OPEN" | "CLUB" | "CROSS_CLUB" | "PRIVATE"
  >(deriveAccess(defaultType ?? "ARENA"));
  const [visibility, setVisibility] = useState<
    "PUBLIC" | "PRIVATE" | "CLUB_ONLY"
  >(deriveVisibility(deriveAccess(defaultType ?? "ARENA")));
  const [status, setStatus] = useState<"DRAFT" | "REGISTRATION_OPEN">(
    "REGISTRATION_OPEN",
  );
  const [isRated, setIsRated] = useState(true);
  const [inviteOnly, setInviteOnly] = useState(false);
  const [premiumOnly, setPremiumOnly] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(false);

  // Club selection
  const [clubId, setClubId] = useState<string>("");
  const [invitedClubIds, setInvitedClubIds] = useState<string[]>([]);
  const [adminClubs, setAdminClubs] = useState<ClubSummary[]>([]);
  const [allClubs, setAllClubs] = useState<ClubSummary[]>([]);
  const [loadingClubs, setLoadingClubs] = useState(false);

  // Step 2 — Schedule
  const [regOpenAt, setRegOpenAt] = useState(nowPlus(0));
  const [regCloseAt, setRegCloseAt] = useState(nowPlus(60));
  const [startTime, setStartTime] = useState(nowPlus(90));
  const [endTime, setEndTime] = useState(nowPlus(270));

  // Step 3 — Settings
  const [minPlayers, setMinPlayers] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("");
  const [minRating, setMinRating] = useState("");
  const [maxRating, setMaxRating] = useState("");
  const [allowLateJoin, setAllowLateJoin] = useState(false);
  // Default 7 for Swiss; auto-adjust when the type changes to RR
  const [totalRounds, setTotalRounds] = useState("7");
  const [pairingEngine, setPairingEngine] = useState<
    "DUTCH" | "BURSTEIN" | "ACCELERATED"
  >("DUTCH");
  const [durationMinutes, setDurationMinutes] = useState("90");
  const [pairingLogic, setPairingLogic] = useState<
    "SCORE_BASED" | "RATING_BASED"
  >("SCORE_BASED");
  const [berserkEnabled, setBerserkEnabled] = useState(false);
  const [streakBonusEnabled, setStreakBonusEnabled] = useState(false);
  const [daysPerMove, setDaysPerMove] = useState("3");
  const [groupSize, setGroupSize] = useState("4");
  const [advancePerGroup, setAdvancePerGroup] = useState("2");

  const [error, setError] = useState<string | null>(null);

  const selectedType = TYPE_OPTIONS.find((t) => t.value === tournamentType)!;
  const isSwiss = [
    "CLUB_SWISS",
    "GLOBAL_SWISS",
    "CLUB_ROUND_ROBIN",
    "GLOBAL_ROUND_ROBIN",
  ].includes(tournamentType);
  const isPureSwiss =
    tournamentType === "CLUB_SWISS" || tournamentType === "GLOBAL_SWISS";
  const isRoundRobin =
    tournamentType === "CLUB_ROUND_ROBIN" ||
    tournamentType === "GLOBAL_ROUND_ROBIN";
  const isClubType =
    tournamentType === "CLUB_SWISS" || tournamentType === "CLUB_ROUND_ROBIN";
  const isGlobalType =
    tournamentType === "GLOBAL_SWISS" ||
    tournamentType === "GLOBAL_ROUND_ROBIN";
  const needsClub =
    isClubType || accessType === "CLUB" || accessType === "CROSS_CLUB";

  // Fetch admin clubs when a club-related type or access type is selected
  useEffect(() => {
    if (!needsClub) return;
    setLoadingClubs(true);
    getMyAdminClubs()
      .then(setAdminClubs)
      .catch(() => setAdminClubs([]))
      .finally(() => setLoadingClubs(false));
  }, [needsClub]);

  // Fetch all clubs when CROSS_CLUB is selected (for inviting other clubs)
  useEffect(() => {
    if (accessType !== "CROSS_CLUB") {
      setAllClubs([]);
      return;
    }
    listClubs({ limit: 50 })
      .then((res) => setAllClubs(res.clubs as ClubSummary[]))
      .catch(() => setAllClubs([]));
  }, [accessType]);

  const ACCESS_OPTIONS: {
    value: typeof accessType;
    label: string;
    desc: string;
  }[] = isClubType
    ? [
        { value: "CLUB", label: "Club", desc: "Visible to club members only" },
        {
          value: "CROSS_CLUB",
          label: "Cross-Club",
          desc: "Invite other clubs to participate",
        },
      ]
    : isGlobalType
      ? [
          { value: "OPEN", label: "Open", desc: "Anyone worldwide can join" },
          {
            value: "CROSS_CLUB",
            label: "Cross-Club",
            desc: "Invite specific clubs",
          },
        ]
      : [
          { value: "OPEN", label: "Open", desc: "Public — anyone can join" },
          { value: "CLUB", label: "Club", desc: "Club members only" },
          {
            value: "CROSS_CLUB",
            label: "Cross-Club",
            desc: "Invite other clubs",
          },
          { value: "PRIVATE", label: "Private", desc: "Invite-only" },
        ];

  function handleTypeChange(type: TournamentType) {
    setTournamentType(type);
    setTimeControlId("");
    setClubId("");
    setInvitedClubIds([]);
    // Sensible round defaults per format
    if (type === "CLUB_ROUND_ROBIN" || type === "GLOBAL_ROUND_ROBIN") {
      setTotalRounds("7"); // user can lower; system caps at n_players - 1
    } else if (type === "CLUB_SWISS" || type === "GLOBAL_SWISS") {
      setTotalRounds("7");
    }
    const newAccess = deriveAccess(type);
    setAccessType(newAccess);
    setVisibility(deriveVisibility(newAccess));
  }

  function handleAccessChange(val: typeof accessType) {
    setAccessType(val);
    setVisibility(deriveVisibility(val));
    setClubId("");
    setInvitedClubIds([]);
  }

  function toggleInvitedClub(id: string) {
    setInvitedClubIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }

  function validate(): string | null {
    if (step === 1) {
      if (!name.trim()) return "Tournament name is required.";
      if (needsClub && !clubId)
        return "Please select your club for this event.";
      if (accessType === "CROSS_CLUB" && invitedClubIds.length === 0)
        return "Select at least one club to invite.";
    }
    if (step === 2) {
      if (!regOpenAt || !regCloseAt || !startTime)
        return "All schedule fields are required.";
      if (new Date(regCloseAt) <= new Date(regOpenAt))
        return "Registration close must be after registration open.";
      if (new Date(startTime) <= new Date(regOpenAt))
        return "Start time must be after registration opens.";
      const gapMin =
        (new Date(startTime).getTime() - new Date(regCloseAt).getTime()) /
        60_000;
      if (gapMin < 20)
        return "Registration must close at least 20 minutes before the start time.";
      if (gapMin > 45)
        return "Registration must close no more than 45 minutes before the start time.";
    }
    if (
      step === 3 &&
      tournamentType === "ARENA" &&
      (!durationMinutes || Number(durationMinutes) < 10)
    ) {
      return "Arena duration must be at least 10 minutes.";
    }
    if (step === 3 && isSwiss && (!totalRounds || Number(totalRounds) < 1)) {
      return "Number of rounds must be at least 1.";
    }
    return null;
  }

  function next() {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => s + 1);
  }

  function back() {
    setError(null);
    setStep((s) => s - 1);
  }

  async function handleSubmit() {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError(null);

    const payload: CreateTournamentPayload = {
      name: name.trim(),
      description: description.trim() || undefined,
      tournamentType,
      status,
      timeControlId: timeControlId || undefined,
      accessType,
      visibility,
      gameType,
      isRated,
      inviteOnly,
      premiumOnly,
      requiresApproval,
      autoStartWhenFull: false,
      allowVacation: false,
      allowLateJoin,
      useTieBreaks: true,
      minPlayers: minPlayers ? Number(minPlayers) : undefined,
      maxPlayers: maxPlayers ? Number(maxPlayers) : undefined,
      minRating: minRating ? Number(minRating) : undefined,
      maxRating: maxRating ? Number(maxRating) : undefined,
      registrationOpenAt: new Date(regOpenAt).toISOString(),
      registrationCloseAt: new Date(regCloseAt).toISOString(),
      startTime: new Date(startTime).toISOString(),
      endTime: endTime ? new Date(endTime).toISOString() : undefined,
      clubId: clubId || undefined,
      invitedClubIds: invitedClubIds.length ? invitedClubIds : undefined,
    };

    if (tournamentType === "ARENA") {
      payload.arenaSettings = {
        durationMinutes: Number(durationMinutes),
        pairingLogic,
        berserkEnabled,
        streakBonusEnabled,
      };
    } else if (isSwiss) {
      payload.swissSettings = {
        totalRounds: Number(totalRounds),
        pairingEngine,
        preventRepeatPairs: true,
        balanceColors: true,
        avoidThreeSameColors: true,
        allowBye: true,
      };
    } else if (tournamentType === "DAILY") {
      payload.dailySettings = {
        groupSize: Number(groupSize),
        advancePerGroup: Number(advancePerGroup),
        concurrentGamesPerOpponent: 2,
        daysPerMove: Number(daysPerMove),
        allowVacation: false,
        useTieBreaks: true,
      };
    }

    await onSubmit(payload);
  }

  // Filter out the creator's own club from the cross-club invite list
  const otherClubs = allClubs.filter((c) => c.id !== clubId);

  return (
    <div
      className={styles.overlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <span
              className={styles.headerIcon}
              style={{ color: selectedType.color }}
            >
              {selectedType.icon}
            </span>
            <div>
              <h2 className={styles.headerTitle}>New Tournament</h2>
              <p className={styles.headerSub}>{STEPS[step]}</p>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Step progress */}
        <div className={styles.stepper}>
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`${styles.stepItem} ${i <= step ? styles.stepDone : ""} ${i === step ? styles.stepActive : ""}`}
            >
              <div className={styles.stepDot}>{i < step ? "✓" : i + 1}</div>
              <span className={styles.stepLabel}>{s}</span>
              {i < STEPS.length - 1 && <div className={styles.stepLine} />}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className={styles.body}>
          {/* STEP 0: Format */}
          {step === 0 && (
            <div className={styles.typeGrid}>
              {TYPE_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={`${styles.typeCard} ${tournamentType === t.value ? styles.typeCardActive : ""}`}
                  onClick={() => handleTypeChange(t.value)}
                  style={
                    tournamentType === t.value
                      ? ({ "--tc": t.color } as React.CSSProperties)
                      : undefined
                  }
                >
                  <span
                    className={styles.typeCardIcon}
                    style={{ color: t.color }}
                  >
                    {t.icon}
                  </span>
                  <span className={styles.typeCardLabel}>{t.label}</span>
                  <span className={styles.typeCardDesc}>{t.desc}</span>
                  {t.requiresAdmin && (
                    <span className={styles.typeCardBadge}>Admin only</span>
                  )}
                  {tournamentType === t.value && (
                    <span className={styles.typeCardCheck}>✓</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* STEP 1: Details */}
          {step === 1 && (
            <div className={styles.fields}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Tournament Name *</label>
                <input
                  className={styles.input}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Spring Blitz Open 2026"
                  maxLength={80}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Description</label>
                <textarea
                  className={`${styles.input} ${styles.textarea}`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional: describe the event, prizes, rules..."
                  rows={3}
                  maxLength={500}
                />
              </div>

              {/* Access type selector — shown for non-locked types */}
              {!isClubType && (
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Access Type</label>
                  <div className={styles.accessChips}>
                    {ACCESS_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        className={`${styles.accessChip} ${accessType === o.value ? styles.accessChipActive : ""}`}
                        onClick={() => handleAccessChange(o.value)}
                      >
                        <span className={styles.accessChipLabel}>
                          {o.label}
                        </span>
                        <span className={styles.accessChipDesc}>{o.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Club selector — shown when event is club-based or CROSS_CLUB */}
              {needsClub && (
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>
                    {accessType === "CROSS_CLUB" ? "Your Club (host)" : "Club"}{" "}
                    *
                  </label>
                  {loadingClubs ? (
                    <p className={styles.clubLoading}>Loading your clubs…</p>
                  ) : adminClubs.length === 0 ? (
                    <p className={styles.clubEmpty}>
                      You are not an admin of any club. Club admins can create
                      club events.
                    </p>
                  ) : (
                    <div className={styles.clubList}>
                      {adminClubs.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className={`${styles.clubItem} ${clubId === c.id ? styles.clubItemActive : ""}`}
                          onClick={() => setClubId(clubId === c.id ? "" : c.id)}
                        >
                          {c.name}
                          {c._count && (
                            <span className={styles.clubMemberCount}>
                              {c._count.members} members
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Cross-club: invite other clubs */}
              {accessType === "CROSS_CLUB" && clubId && (
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>
                    Invite Other Clubs *
                  </label>
                  <p className={styles.clubHint}>
                    Selected clubs will receive a join request from you.
                  </p>
                  {otherClubs.length === 0 ? (
                    <p className={styles.clubEmpty}>No other clubs found.</p>
                  ) : (
                    <div className={styles.clubList}>
                      {otherClubs.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className={`${styles.clubItem} ${invitedClubIds.includes(c.id) ? styles.clubItemActive : ""}`}
                          onClick={() => toggleInvitedClub(c.id)}
                        >
                          {c.name}
                          {c._count && (
                            <span className={styles.clubMemberCount}>
                              {c._count.members} members
                            </span>
                          )}
                          {invitedClubIds.includes(c.id) && (
                            <span className={styles.clubItemCheck}>
                              ✓ Invited
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Visibility — locked for CLUB and CROSS_CLUB */}
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Game Type</label>
                  <select
                    className={styles.select}
                    value={gameType}
                    onChange={(e) =>
                      setGameType(e.target.value as "STANDARD" | "CHESS960")
                    }
                  >
                    <option value="STANDARD">Standard Chess</option>
                    <option value="CHESS960">Chess960</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Visibility</label>
                  {accessType === "CLUB" || accessType === "CROSS_CLUB" ? (
                    <div className={styles.lockedField}>
                      {accessType === "CLUB" ? "Club Only" : "Public"}
                      <span className={styles.lockedHint}>
                        auto-set by access type
                      </span>
                    </div>
                  ) : (
                    <select
                      className={styles.select}
                      value={visibility}
                      onChange={(e) =>
                        setVisibility(e.target.value as typeof visibility)
                      }
                    >
                      <option value="PUBLIC">Public</option>
                      <option value="PRIVATE">Private</option>
                      <option value="CLUB_ONLY">Club Only</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Time Control */}
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Time Control</label>
                <div className={styles.tcSection}>
                  {tournamentType === "DAILY" ? (
                    <div className={styles.tcGroup}>
                      <span
                        className={styles.tcCategoryLabel}
                        style={{ color: TC_CATEGORY_COLORS["DAILY"] }}
                      >
                        Daily
                      </span>
                      <div className={styles.tcChips}>
                        {DAILY_CONTROLS.map((tc) => (
                          <button
                            key={tc.id}
                            type="button"
                            className={`${styles.tcChip} ${timeControlId === tc.id ? styles.tcChipActive : ""}`}
                            style={
                              timeControlId === tc.id
                                ? ({
                                    "--chip-color": TC_CATEGORY_COLORS["DAILY"],
                                  } as React.CSSProperties)
                                : undefined
                            }
                            onClick={() =>
                              setTimeControlId(
                                timeControlId === tc.id ? "" : tc.id,
                              )
                            }
                          >
                            {tc.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    (
                      Object.keys(TIME_CONTROLS) as Array<
                        keyof typeof TIME_CONTROLS
                      >
                    ).map((cat) => (
                      <div key={cat} className={styles.tcGroup}>
                        <span
                          className={styles.tcCategoryLabel}
                          style={{ color: TC_CATEGORY_COLORS[cat] }}
                        >
                          {TC_CATEGORY_LABELS[cat]}
                        </span>
                        <div className={styles.tcChips}>
                          {TIME_CONTROLS[cat].map((tc) => (
                            <button
                              key={tc.id}
                              type="button"
                              className={`${styles.tcChip} ${timeControlId === tc.id ? styles.tcChipActive : ""}`}
                              style={
                                timeControlId === tc.id
                                  ? ({
                                      "--chip-color": TC_CATEGORY_COLORS[cat],
                                    } as React.CSSProperties)
                                  : undefined
                              }
                              onClick={() =>
                                setTimeControlId(
                                  timeControlId === tc.id ? "" : tc.id,
                                )
                              }
                            >
                              {tc.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className={styles.toggleGroup}>
                {(
                  [
                    [
                      isRated,
                      setIsRated,
                      "Rated game",
                      "Results affect ratings",
                    ],
                    [
                      inviteOnly,
                      setInviteOnly,
                      "Invite only",
                      "Players need an invitation",
                    ],
                    [
                      premiumOnly,
                      setPremiumOnly,
                      "Premium only",
                      "Restricted to premium members",
                    ],
                    [
                      requiresApproval,
                      setRequiresApproval,
                      "Require approval",
                      "Organizer approves joiners",
                    ],
                  ] as [boolean, (v: boolean) => void, string, string][]
                ).map(([val, set, label, sub]) => (
                  <label key={label} className={styles.toggle}>
                    <div className={styles.toggleInfo}>
                      <span className={styles.toggleLabel}>{label}</span>
                      <span className={styles.toggleSub}>{sub}</span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={val}
                      className={`${styles.toggleSwitch} ${val ? styles.toggleOn : ""}`}
                      onClick={() => set(!val)}
                    >
                      <span className={styles.toggleThumb} />
                    </button>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: Schedule */}
          {step === 2 && (
            <div className={styles.fields}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Registration Opens</label>
                <input
                  type="datetime-local"
                  className={styles.input}
                  value={regOpenAt}
                  onChange={(e) => setRegOpenAt(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Registration Closes</label>
                <input
                  type="datetime-local"
                  className={styles.input}
                  value={regCloseAt}
                  onChange={(e) => setRegCloseAt(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Tournament Starts *</label>
                <input
                  type="datetime-local"
                  className={styles.input}
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>
                  Tournament Ends (optional)
                </label>
                <input
                  type="datetime-local"
                  className={styles.input}
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* STEP 3: Type-specific settings */}
          {step === 3 && (
            <div className={styles.fields}>
              {/* Registration status */}
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Registration Status</label>
                <div className={styles.statusToggleRow}>
                  {(["REGISTRATION_OPEN", "DRAFT"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`${styles.statusToggleBtn} ${status === s ? styles.statusToggleBtnActive : ""}`}
                      style={
                        status === s && s === "REGISTRATION_OPEN"
                          ? { borderColor: "#3ecf8e", color: "#3ecf8e" }
                          : undefined
                      }
                      onClick={() => setStatus(s)}
                    >
                      {s === "REGISTRATION_OPEN"
                        ? "Open for registration"
                        : "Draft (not public)"}
                    </button>
                  ))}
                </div>
                <p className={styles.statusHint}>
                  {status === "REGISTRATION_OPEN"
                    ? "Players can find and join this tournament immediately."
                    : "Tournament is saved as draft — players cannot join yet."}
                </p>
              </div>

              <div className={styles.divider} />

              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Min Players</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={minPlayers}
                    onChange={(e) => setMinPlayers(e.target.value)}
                    placeholder="e.g. 4"
                    min="2"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Max Players</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(e.target.value)}
                    placeholder="e.g. 64"
                    min="2"
                  />
                </div>
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Min Rating</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={minRating}
                    onChange={(e) => setMinRating(e.target.value)}
                    placeholder="e.g. 1000"
                    min="0"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Max Rating</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={maxRating}
                    onChange={(e) => setMaxRating(e.target.value)}
                    placeholder="e.g. 2500"
                    min="0"
                  />
                </div>
              </div>

              <div className={styles.divider} />

              {tournamentType === "ARENA" && (
                <>
                  <div className={styles.fieldRow}>
                    <div className={styles.field}>
                      <label className={styles.fieldLabel}>
                        Duration (minutes) *
                      </label>
                      <input
                        type="number"
                        className={styles.input}
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(e.target.value)}
                        min="10"
                        max="360"
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.fieldLabel}>Pairing Logic</label>
                      <select
                        className={styles.select}
                        value={pairingLogic}
                        onChange={(e) =>
                          setPairingLogic(e.target.value as typeof pairingLogic)
                        }
                      >
                        <option value="SCORE_BASED">Score Based</option>
                        <option value="RATING_BASED">Rating Based</option>
                      </select>
                    </div>
                  </div>
                  <div className={styles.toggleGroup}>
                    <label className={styles.toggle}>
                      <div className={styles.toggleInfo}>
                        <span className={styles.toggleLabel}>Berserk mode</span>
                        <span className={styles.toggleSub}>
                          Players can halve their time for bonus points
                        </span>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={berserkEnabled}
                        className={`${styles.toggleSwitch} ${berserkEnabled ? styles.toggleOn : ""}`}
                        onClick={() => setBerserkEnabled(!berserkEnabled)}
                      >
                        <span className={styles.toggleThumb} />
                      </button>
                    </label>
                    <label className={styles.toggle}>
                      <div className={styles.toggleInfo}>
                        <span className={styles.toggleLabel}>Streak bonus</span>
                        <span className={styles.toggleSub}>
                          Extra points for consecutive wins
                        </span>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={streakBonusEnabled}
                        className={`${styles.toggleSwitch} ${streakBonusEnabled ? styles.toggleOn : ""}`}
                        onClick={() =>
                          setStreakBonusEnabled(!streakBonusEnabled)
                        }
                      >
                        <span className={styles.toggleThumb} />
                      </button>
                    </label>
                  </div>
                </>
              )}

              {/* ── Swiss-specific fields ── */}
              {isPureSwiss && (
                <>
                  <div className={styles.fieldRow}>
                    <div className={styles.field}>
                      <label className={styles.fieldLabel}>
                        Number of Rounds *
                      </label>
                      <input
                        type="number"
                        className={styles.input}
                        value={totalRounds}
                        onChange={(e) => setTotalRounds(e.target.value)}
                        min="1"
                        max="30"
                        placeholder="e.g. 7"
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.fieldLabel}>
                        Pairing Engine
                      </label>
                      <select
                        className={styles.select}
                        value={pairingEngine}
                        onChange={(e) =>
                          setPairingEngine(
                            e.target.value as typeof pairingEngine,
                          )
                        }
                      >
                        <option value="DUTCH">Dutch</option>
                        <option value="BURSTEIN">Burstein</option>
                        <option value="ACCELERATED">Accelerated</option>
                      </select>
                    </div>
                  </div>
                  <label className={styles.toggle}>
                    <div className={styles.toggleInfo}>
                      <span className={styles.toggleLabel}>
                        Allow late join
                      </span>
                      <span className={styles.toggleSub}>
                        Players can join after round 1
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={allowLateJoin}
                      className={`${styles.toggleSwitch} ${allowLateJoin ? styles.toggleOn : ""}`}
                      onClick={() => setAllowLateJoin(!allowLateJoin)}
                    >
                      <span className={styles.toggleThumb} />
                    </button>
                  </label>
                </>
              )}

              {/* ── Round Robin-specific fields ── */}
              {isRoundRobin && (
                <>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Max Rounds *</label>
                    <input
                      type="number"
                      className={styles.input}
                      value={totalRounds}
                      onChange={(e) => setTotalRounds(e.target.value)}
                      min="1"
                      max="50"
                      placeholder="e.g. 7"
                    />
                    <span className={styles.statusHint}>
                      For N players a full Round Robin takes N−1 rounds (N even)
                      or N rounds (N odd). The system will stop early if this
                      limit is reached.
                    </span>
                  </div>
                </>
              )}

              {tournamentType === "DAILY" && (
                <>
                  <div className={styles.fieldRow}>
                    <div className={styles.field}>
                      <label className={styles.fieldLabel}>
                        Days Per Move *
                      </label>
                      <input
                        type="number"
                        className={styles.input}
                        value={daysPerMove}
                        onChange={(e) => setDaysPerMove(e.target.value)}
                        min="1"
                        max="14"
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.fieldLabel}>Group Size *</label>
                      <input
                        type="number"
                        className={styles.input}
                        value={groupSize}
                        onChange={(e) => setGroupSize(e.target.value)}
                        min="2"
                        max="20"
                      />
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>
                      Advance Per Group *
                    </label>
                    <input
                      type="number"
                      className={styles.input}
                      value={advancePerGroup}
                      onChange={(e) => setAdvancePerGroup(e.target.value)}
                      min="1"
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Error */}
        {error && <div className={styles.error}>{error}</div>}

        {/* Footer */}
        <div className={styles.footer}>
          {step > 0 ? (
            <button
              type="button"
              className={styles.backBtn}
              onClick={back}
              disabled={submitting}
            >
              <ChevronLeft size={15} /> Back
            </button>
          ) : (
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
            >
              Cancel
            </button>
          )}

          {step < STEPS.length - 1 ? (
            <button type="button" className={styles.nextBtn} onClick={next}>
              Continue <ChevronRight size={15} />
            </button>
          ) : (
            <button
              type="button"
              className={styles.submitBtn}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Creating…" : "Create Tournament"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
