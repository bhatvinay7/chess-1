"use client";
import React, { useRef, useState, useEffect, useCallback } from "react";
import { Users, Trophy, Shield, Star, UserCheck, UserMinus, Loader2, Edit2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { uploadFile } from "../../app/lib/api/upload";
import type { Club, ClubMember } from "../../types/club";
import type { TournamentListItem } from "../tournament/types";
import { useAuth } from "../../hooks/useAuth";
import {
  useRequestJoinClub,
  useJoinRequests,
  useHandleJoinRequest,
  useRemoveMember,
  useSendCoordinatorInvite,
  useUpdateClub,
} from "../../hooks/useClubs";
import { getClubTournaments } from "../../app/lib/api/clubs";
import { joinTournament } from "../../app/lib/api/tournaments";
import styles from "./ClubProfile.module.css";

const ROLE_ICON: Record<string, React.ReactNode> = {
  ADMIN:       <Shield size={13} style={{ color: "#f59e0b" }} />,
  COORDINATOR: <Star   size={13} style={{ color: "#81b64c" }} />,
  MEMBER:      <UserCheck size={13} style={{ color: "rgba(255,255,255,0.3)" }} />,
};

function MemberRow({
  member,
  isAdmin,
  currentUserId,
  clubId,
}: {
  member: ClubMember;
  isAdmin: boolean;
  currentUserId: string;
  clubId: string;
}) {
  const removeMutation = useRemoveMember(clubId);
  const coordMutation  = useSendCoordinatorInvite(clubId);

  return (
    <div className={styles.memberRow}>
      <div className={styles.memberAvatar}>
        {member.user.profileImageUrl
          ? <img src={member.user.profileImageUrl} alt={member.user.username} />
          : member.user.username.charAt(0).toUpperCase()}
      </div>
      <div className={styles.memberInfo}>
        <span className={styles.memberName}>{member.user.username}</span>
        <span className={styles.memberRating}>{member.user.rating} ELO</span>
      </div>
      <div className={styles.memberRole}>
        {ROLE_ICON[member.role]}
        <span>{member.role.charAt(0) + member.role.slice(1).toLowerCase()}</span>
      </div>
      {isAdmin && member.userId !== currentUserId && member.role !== "ADMIN" && (
        <div className={styles.memberActions}>
          {member.role === "MEMBER" && (
            <button
              type="button"
              className={styles.actionBtnGreen}
              title="Make coordinator"
              onClick={() => coordMutation.mutate({ invitedUserId: member.userId, invitedById: currentUserId })}
              disabled={coordMutation.isPending}
            >
              <Star size={13} /> Coord
            </button>
          )}
          <button
            type="button"
            className={styles.actionBtnRed}
            title="Remove member"
            onClick={() => removeMutation.mutate({ userId: member.userId, adminId: currentUserId })}
            disabled={removeMutation.isPending}
          >
            <UserMinus size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

interface Props {
  club: Club;
}

export default function ClubProfile({ club }: Props) {
  const { user } = useAuth();
  const currentUserId = user?.id ?? "";

  const myMembership = club.members.find((m) => m.userId === currentUserId);
  const isAdmin      = myMembership?.role === "ADMIN";
  const isStaff      = isAdmin || myMembership?.role === "COORDINATOR";
  const isMember     = !!myMembership;

  const joinMutation   = useRequestJoinClub(club.id);
  const updateMutation = useUpdateClub(club.id);
  const imgFileRef     = useRef<HTMLInputElement>(null);
  const [imgUploading, setImgUploading] = useState(false);

  const { data: joinRequests } = useJoinRequests(club.id, isStaff ? currentUserId : undefined);
  const handleRequest = useHandleJoinRequest(club.id);

  const router = useRouter();
  const [editing, setEditing]       = useState(false);
  const [editName, setEditName]     = useState(club.name);
  const [editDesc, setEditDesc]     = useState(club.description ?? "");
  const [tab, setTab]               = useState<"members" | "requests" | "tournaments">("members");

  const [tournaments, setTournaments]     = useState<TournamentListItem[]>([]);
  const [tournamentsLoading, setTournamentsLoading] = useState(false);
  const [joiningId, setJoiningId]         = useState<string | null>(null);
  const [toast, setToast]                 = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const loadTournaments = useCallback(async () => {
    setTournamentsLoading(true);
    try {
      const res = await getClubTournaments(club.id);
      setTournaments(res.data ?? []);
    } catch {
      setTournaments([]);
    } finally {
      setTournamentsLoading(false);
    }
  }, [club.id]);

  useEffect(() => {
    if (tab === "tournaments") loadTournaments();
  }, [tab, loadTournaments]);

  const handleJoinTournament = async (tournamentId: string) => {
    setJoiningId(tournamentId);
    try {
      await joinTournament(tournamentId);
      showToast("Joined tournament!");
      await loadTournaments();
      router.push(`/tournament/${tournamentId}`);
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? "Could not join tournament.", false);
    } finally {
      setJoiningId(null);
    }
  };

  const handleSave = () => {
    updateMutation.mutate(
      { name: editName, description: editDesc, requesterId: currentUserId },
      { onSuccess: () => setEditing(false) },
    );
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImgUploading(true);
    try {
      const res = await uploadFile(file, "clubs");
      updateMutation.mutate({ imageUrl: res.url, requesterId: currentUserId });
    } finally {
      setImgUploading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Banner */}
      <div className={styles.banner}>
        <img src={club.imageUrl} alt={club.name} className={styles.bannerImg} />
        {/* hidden file input for banner image */}
        <input ref={imgFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
        <div className={styles.bannerOverlay} />
        <div className={styles.bannerContent}>
          {editing ? (
            <div className={styles.editForm}>
              <button
                type="button"
                className={styles.cancelBtn}
                style={{ width: "fit-content", display: "flex", alignItems: "center", gap: "0.35rem" }}
                onClick={() => imgFileRef.current?.click()}
                disabled={imgUploading}
              >
                {imgUploading
                  ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
                  : <Upload size={13} />}
                {imgUploading ? "Uploading…" : "Change Banner Image"}
              </button>
              <input
                className={styles.editInput}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Club name"
              />
              <textarea
                className={styles.editTextarea}
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Description"
                rows={2}
              />
              <div className={styles.editBtns}>
                <button className={styles.saveBtn} onClick={handleSave} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : "Save"}
                </button>
                <button className={styles.cancelBtn} onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <h1 className={styles.clubName}>
                {club.name}
                {isAdmin && (
                  <Edit2
                    size={16}
                    className={styles.editIcon}
                    onClick={() => { setEditing(true); setEditName(club.name); setEditDesc(club.description ?? ""); }}
                  />
                )}
              </h1>
              {club.description && <p className={styles.clubDesc}>{club.description}</p>}
            </>
          )}
          <div className={styles.stats}>
            <span><Users size={14} /> {club._count.members} members</span>
            <span><Trophy size={14} /> {club._count.tournaments} tournaments</span>
          </div>
        </div>
      </div>

      {/* Join / membership status */}
      {currentUserId && !isMember && (
        <div className={styles.joinBar}>
          <button
            type="button"
            className={styles.joinBtn}
            onClick={() => joinMutation.mutate(currentUserId)}
            disabled={joinMutation.isPending || joinMutation.isSuccess}
          >
            {joinMutation.isPending
              ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
              : joinMutation.isSuccess
              ? "Request sent!"
              : "Request to Join"}
          </button>
        </div>
      )}

      {isMember && (
        <div className={styles.membershipBadge}>
          {ROLE_ICON[myMembership!.role]}
          <span>You are a {myMembership!.role.charAt(0) + myMembership!.role.slice(1).toLowerCase()}</span>
        </div>
      )}

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${tab === "members" ? styles.tabActive : ""}`}
          onClick={() => setTab("members")}
        >
          Members ({club._count.members})
        </button>
        <button
          type="button"
          className={`${styles.tab} ${tab === "tournaments" ? styles.tabActive : ""}`}
          onClick={() => setTab("tournaments")}
        >
          Tournaments {club._count.tournaments > 0 ? `(${club._count.tournaments})` : ""}
        </button>
        {isStaff && (
          <button
            type="button"
            className={`${styles.tab} ${tab === "requests" ? styles.tabActive : ""}`}
            onClick={() => setTab("requests")}
          >
            Join Requests {joinRequests && joinRequests.length > 0 ? `(${joinRequests.length})` : ""}
          </button>
        )}
      </div>

      {/* Members list */}
      {tab === "members" && (
        <div className={styles.membersList}>
          {club.members.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              isAdmin={isAdmin}
              currentUserId={currentUserId}
              clubId={club.id}
            />
          ))}
        </div>
      )}

      {/* Tournaments list */}
      {tab === "tournaments" && (
        <div className={styles.membersList}>
          {tournamentsLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "2rem", color: "rgba(255,255,255,0.4)" }}>
              <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
            </div>
          ) : tournaments.length === 0 ? (
            <p className={styles.empty}>No tournaments yet.</p>
          ) : (
            tournaments.map((t) => {
              const isJoined = !!t.userRole;
              const canJoin = isMember && !isJoined && t.status === "REGISTRATION_OPEN";
              return (
                <div
                  key={t.id}
                  className={styles.memberRow}
                  style={{ cursor: "pointer" }}
                  onClick={() => router.push(`/tournament/${t.id}`)}
                >
                  <div className={styles.memberInfo} style={{ flex: 1 }}>
                    <span className={styles.memberName}>{t.name}</span>
                    <span className={styles.memberRating}>
                      {t.status.replace(/_/g, " ")} · {t.participantCount}{t.maxPlayers ? `/${t.maxPlayers}` : ""} players
                    </span>
                  </div>
                  <div className={styles.memberActions} onClick={(e) => e.stopPropagation()}>
                    {isJoined ? (
                      <span className={styles.actionBtnGreen} style={{ cursor: "default" }}>Joined</span>
                    ) : canJoin ? (
                      <button
                        type="button"
                        className={styles.actionBtnGreen}
                        onClick={() => handleJoinTournament(t.id)}
                        disabled={joiningId === t.id}
                      >
                        {joiningId === t.id ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : "Join"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={styles.actionBtnRed}
                        style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}
                        onClick={() => router.push(`/tournament/${t.id}`)}
                      >
                        View
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Join requests */}
      {isStaff && tab === "requests" && (
        <div className={styles.membersList}>
          {!joinRequests || joinRequests.length === 0 ? (
            <p className={styles.empty}>No pending join requests.</p>
          ) : (
            joinRequests.map((req) => (
              <div key={req.id} className={styles.memberRow}>
                <div className={styles.memberAvatar}>
                  {req.user.profileImageUrl
                    ? <img src={req.user.profileImageUrl} alt={req.user.username} />
                    : req.user.username.charAt(0).toUpperCase()}
                </div>
                <div className={styles.memberInfo}>
                  <span className={styles.memberName}>{req.user.username}</span>
                  <span className={styles.memberRating}>{req.user.rating} ELO</span>
                </div>
                <div className={styles.memberActions}>
                  <button
                    type="button"
                    className={styles.actionBtnGreen}
                    onClick={() => handleRequest.mutate({ requestId: req.id, action: "accept", adminId: currentUserId })}
                    disabled={handleRequest.isPending}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    className={styles.actionBtnRed}
                    onClick={() => handleRequest.mutate({ requestId: req.id, action: "reject", adminId: currentUserId })}
                    disabled={handleRequest.isPending}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: "max(0.75rem, env(safe-area-inset-bottom))", left: "50%", transform: "translateX(-50%)",
          background: toast.ok ? "#1a4a1a" : "#4a1a1a",
          border: `1px solid ${toast.ok ? "#2d7a2d" : "#7a2d2d"}`,
          color: toast.ok ? "#81c995" : "#f48771",
          padding: "0.6rem 1.2rem", borderRadius: "6px", fontSize: "0.85rem",
          zIndex: 1000, pointerEvents: "none", maxWidth: "calc(100vw - 24px)",
          width: "max-content", textAlign: "center", overflowWrap: "anywhere",
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
