"use client";
import React, { useRef, useState } from "react";
import { Search, Plus, Loader2, Upload } from "lucide-react";
import { useClubList, useCreateClub } from "../../hooks/useClubs";
import { useAuth } from "../../hooks/useAuth";
import ClubCard from "./ClubCard";
import { uploadFile } from "../../app/lib/api/upload";
import styles from "./clubs.module.css";

export default function ClubsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", imageUrl: "" });
  const [imgUploading, setImgUploading] = useState(false);
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useClubList({
    page,
    limit: 20,
    search: search || undefined,
  });
  const createMutation = useCreateClub();

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImgUploading(true);
    try {
      const res = await uploadFile(file, "clubs");
      setForm((f) => ({ ...f, imageUrl: res.url }));
      setImgPreview(res.url);
    } finally {
      setImgUploading(false);
    }
  };

  const handleCreate = () => {
    if (!user?.id || !form.name.trim()) return;
    createMutation.mutate(
      {
        name: form.name,
        description: form.description || undefined,
        imageUrl: form.imageUrl || undefined,
        creatorId: user.id,
      },
      {
        onSuccess: () => {
          setCreating(false);
          setForm({ name: "", description: "", imageUrl: "" });
          setImgPreview(null);
        },
      },
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Clubs</h1>
          <p className={styles.subtitle}>
            Join a club, host tournaments, and compete with members.
          </p>
        </div>
        {user && (
          <button
            type="button"
            className={styles.createBtn}
            onClick={() => setCreating(true)}
          >
            <Plus size={15} /> Create Club
          </button>
        )}
      </div>

      <div className={styles.searchBar}>
        <Search size={15} className={styles.searchIcon} />
        <input
          className={styles.searchInput}
          placeholder="Search clubs…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {creating && (
        <div className={styles.createForm}>
          <h2 className={styles.formTitle}>Create a Club</h2>

          {/* Image upload */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleImagePick}
          />
          <div className={styles.imageUploadRow}>
            {imgPreview ? (
              <img
                src={imgPreview}
                alt="Club preview"
                className={styles.imagePreview}
              />
            ) : (
              <div className={styles.imagePlaceholder}>
                <Upload size={20} style={{ opacity: 0.5 }} />
              </div>
            )}
            <button
              type="button"
              className={styles.uploadBtn}
              onClick={() => fileRef.current?.click()}
              disabled={imgUploading}
            >
              {imgUploading ? (
                <Loader2
                  size={14}
                  style={{ animation: "spin 1s linear infinite" }}
                />
              ) : (
                "Upload Image"
              )}
            </button>
          </div>

          <input
            className={styles.formInput}
            placeholder="Club name *"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <textarea
            className={styles.formTextarea}
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            rows={3}
          />
          <div className={styles.formBtns}>
            <button
              type="button"
              className={styles.saveBtn}
              onClick={handleCreate}
              disabled={
                !form.name.trim() || createMutation.isPending || imgUploading
              }
            >
              {createMutation.isPending ? (
                <Loader2
                  size={14}
                  style={{ animation: "spin 1s linear infinite" }}
                />
              ) : (
                "Create"
              )}
            </button>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => {
                setCreating(false);
                setImgPreview(null);
              }}
            >
              Cancel
            </button>
          </div>
          {createMutation.isError && (
            <p className={styles.error}>
              Failed to create club. Name may already be taken.
            </p>
          )}
        </div>
      )}

      {isLoading ? (
        <div className={styles.loading}>
          <Loader2 size={22} style={{ animation: "spin 1s linear infinite" }} />
        </div>
      ) : !data || data.clubs.length === 0 ? (
        <div className={styles.empty}>
          No clubs found. Be the first to create one!
        </div>
      ) : (
        <>
          <div className={styles.grid}>
            {data.clubs.map((club) => (
              <ClubCard key={club.id} club={club} />
            ))}
          </div>

          {data.totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                type="button"
                className={styles.pageBtn}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Prev
              </button>
              <span className={styles.pageInfo}>
                {page} / {data.totalPages}
              </span>
              <button
                type="button"
                className={styles.pageBtn}
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
