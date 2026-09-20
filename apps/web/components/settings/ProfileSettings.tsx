"use client";

import React, { useRef, useState } from "react";
import {
  User,
  Mail,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useProfile, useUpdateProfile } from "../../hooks/useProfile";
import { uploadFile } from "../../app/lib/api/upload";
import styles from "./SettingsPage.module.css";

const DEFAULT_AVATAR =
  "https://res.cloudinary.com/dhfyav4og/image/upload/v1779739162/defaultUser_afbf5y.jpg";

export function ProfileSettings() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile(user?.id);
  const updateMutation = useUpdateProfile();

  const [username, setUsername] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (isLoading)
    return (
      <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
        Loading profile…
      </p>
    );
  if (!profile)
    return (
      <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
        Profile not found.
      </p>
    );

  const avatarUrl = profile.profileImageUrl || DEFAULT_AVATAR;

  const handleSaveUsername = () => {
    const trimmed = username.trim();
    if (!trimmed || trimmed === profile.username) return;
    setSaveStatus("idle");
    updateMutation.mutate(
      { userId: profile.id, data: { username: trimmed } },
      {
        onSuccess: () => {
          setSaveStatus("success");
          setUsername("");
          setTimeout(() => setSaveStatus("idle"), 3000);
        },
        onError: (err: unknown) => {
          const axiosErr = err as {
            response?: { data?: { message?: string } };
          };
          setErrorMsg(
            axiosErr.response?.data?.message || "Failed to update username.",
          );
          setSaveStatus("error");
        },
      },
    );
  };

  const handleAvatarFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setAvatarUploading(true);
    try {
      const result = await uploadFile(file, "avatars");
      updateMutation.mutate({
        userId: profile.id,
        data: { profileImageUrl: result.url },
      });
    } catch {
      // silent
    } finally {
      setAvatarUploading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleAvatarFileChange}
      />

      {/* ── Avatar ── */}
      <section>
        <h3 className={styles.optionGroupTitle}>Profile Picture</h3>
        <div style={ps.avatarRow}>
          <div
            style={{
              position: "relative",
              width: 80,
              height: 80,
              flexShrink: 0,
              cursor: avatarUploading ? "default" : "pointer",
            }}
            onClick={() => !avatarUploading && fileInputRef.current?.click()}
          >
            <img
              src={avatarUrl}
              alt="Profile"
              style={ps.avatar}
              crossOrigin="anonymous"
            />
            <div
              style={{
                ...ps.avatarSpinnerOverlay,
                opacity: avatarUploading ? 1 : 0,
              }}
            >
              <Loader2
                size={20}
                style={{ animation: "spin 1s linear infinite", color: "#fff" }}
              />
            </div>
            {!avatarUploading && (
              <div style={ps.cameraChip}>
                <Camera size={12} />
              </div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <p style={ps.avatarName}>{profile.username}</p>
            <p style={ps.avatarSub}>{profile.email ?? "No email set"}</p>
            <button
              type="button"
              onClick={() => !avatarUploading && fileInputRef.current?.click()}
              style={ps.changePhotoBtn}
              disabled={avatarUploading}
            >
              {avatarUploading ? (
                <>
                  <Loader2
                    size={12}
                    style={{ animation: "spin 1s linear infinite" }}
                  />{" "}
                  Uploading…
                </>
              ) : (
                "Change Photo"
              )}
            </button>
          </div>
        </div>
      </section>

      <div className={styles.divider} />

      {/* ── Username ── */}
      <section>
        <h3 className={styles.optionGroupTitle}>Username</h3>
        <div
          className={styles.toggleRow}
          style={{ borderBottom: "none", padding: 0 }}
        >
          <div className={styles.toggleMeta}>
            <span className={styles.toggleLabel}>Display Name</span>
            <span className={styles.toggleDesc}>
              This is how other players see you. Must be unique.
            </span>
          </div>
        </div>
        <div style={ps.inputGroup}>
          <div style={ps.inputWrap}>
            <User
              size={15}
              style={{ color: "var(--text-muted)", flexShrink: 0 }}
            />
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setSaveStatus("idle");
              }}
              placeholder={profile.username}
              style={ps.input}
              maxLength={30}
              minLength={3}
            />
          </div>
          {saveStatus === "success" && (
            <div style={ps.statusSuccess}>
              <CheckCircle2 size={14} /> Username updated!
            </div>
          )}
          {saveStatus === "error" && (
            <div style={ps.statusError}>
              <AlertCircle size={14} /> {errorMsg}
            </div>
          )}
          <div style={ps.actionRow}>
            <button
              type="button"
              onClick={() => setUsername(profile.username)}
              className={styles.btnCancel}
              disabled={!username || username === profile.username}
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleSaveUsername}
              className={styles.btnSave}
              disabled={
                !username.trim() ||
                username.trim() === profile.username ||
                updateMutation.isPending
              }
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2
                    size={14}
                    style={{ animation: "spin 1s linear infinite" }}
                  />{" "}
                  Saving…
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </div>
      </section>

      <div className={styles.divider} />

      {/* ── Email (read-only) ── */}
      <section>
        <h3 className={styles.optionGroupTitle}>Email Address</h3>
        <div
          className={styles.toggleRow}
          style={{ borderBottom: "none", padding: 0 }}
        >
          <div className={styles.toggleMeta}>
            <span className={styles.toggleLabel}>Account Email</span>
            <span className={styles.toggleDesc}>
              Used for login and notifications. Contact support to change.
            </span>
          </div>
        </div>
        <div style={ps.inputGroup}>
          <div style={{ ...ps.inputWrap, opacity: 0.55 }}>
            <Mail
              size={15}
              style={{ color: "var(--text-muted)", flexShrink: 0 }}
            />
            <input
              type="email"
              value={profile.email ?? ""}
              readOnly
              disabled
              placeholder="No email"
              style={ps.input}
            />
          </div>
          <p
            style={{
              fontSize: "0.76rem",
              color: "var(--text-faint)",
              marginTop: "0.35rem",
            }}
          >
            Email cannot be changed here.
          </p>
        </div>
      </section>
    </div>
  );
}

const ps: Record<string, React.CSSProperties> = {
  avatarRow: { display: "flex", alignItems: "center", gap: "1.25rem" },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: "50%",
    objectFit: "cover",
    border: "2px solid var(--card-border)",
    display: "block",
  },
  avatarSpinnerOverlay: {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    background: "rgba(0,0,0,0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "opacity 0.15s",
  },
  cameraChip: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: "50%",
    background: "#81b64c",
    border: "2px solid var(--page-bg)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarName: {
    fontWeight: 700,
    color: "var(--text-primary)",
    margin: "0 0 0.1rem",
    fontSize: "0.95rem",
  },
  avatarSub: {
    fontSize: "0.8rem",
    color: "var(--text-muted)",
    margin: "0 0 0.5rem",
  },
  changePhotoBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.35rem",
    background: "var(--input-bg)",
    border: "1px solid var(--input-border)",
    borderRadius: "6px",
    color: "var(--text-muted)",
    fontSize: "0.82rem",
    fontWeight: 600,
    cursor: "pointer",
    padding: "0.3rem 0.8rem",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    marginTop: "0.75rem",
  },
  inputWrap: {
    display: "flex",
    alignItems: "center",
    gap: "0.7rem",
    background: "var(--input-bg)",
    border: "1px solid var(--input-border)",
    borderRadius: "6px",
    padding: "0 0.8rem",
  },
  input: {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    color: "var(--text-primary)",
    fontSize: "0.9rem",
    padding: "0.7rem 0",
  },
  actionRow: { display: "flex", gap: "0.65rem", marginTop: "0.1rem" },
  statusSuccess: {
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
    color: "#81b64c",
    fontSize: "0.82rem",
  },
  statusError: {
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
    color: "#ff8080",
    fontSize: "0.82rem",
  },
};
