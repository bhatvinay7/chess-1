"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import type { HistoryFilter } from "../../app/lib/api/games";
import { useAuth } from "../../hooks/useAuth";
import { useGameHistory } from "../../hooks/useGameHistory";
import { GameHistoryFilters } from "./GameHistoryFilters";
import { GameHistoryList } from "./GameHistoryList";
import { GameHistorySummary } from "./GameHistorySummary";
import styles from "./GameHistory.module.css";

const PAGE_SIZE = 8;

/* ── Page number helpers ── */
function pageRange(current: number, total: number): Array<number | "…"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: Array<number | "…"> = [1];

  if (current > 3) pages.push("…");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p++) pages.push(p);

  if (current < total - 2) pages.push("…");
  pages.push(total);

  return pages;
}

export default function GameHistory() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<HistoryFilter>("all");

  const { data, isLoading, isFetching, error } = useGameHistory(
    page,
    PAGE_SIZE,
    filter,
  );

  const games = data?.games ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const filterCounts = data?.filterCounts ?? {
    all: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    rated: 0,
  };
  const summary = data?.summary ?? {
    totalGames: 0,
    winRate: 0,
    reviewedGames: 0,
    averageAccuracy: null,
  };

  const handleFilterChange = (f: HistoryFilter) => {
    setFilter(f);
    setPage(1);
  };

  const handlePage = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(page * PAGE_SIZE, total);

  return (
    <main className={styles.container}>
      <section className={styles.header}>
        <div>
          <p className={styles.kicker}>Analysis archive</p>
          <h1>Game history</h1>
        </div>
        <div className={styles.summary}>
          <span>{summary.totalGames} games</span>
          <strong>{summary.winRate}% win rate</strong>
        </div>
      </section>

      <GameHistorySummary summary={summary} games={games} />

      <GameHistoryFilters
        activeFilter={filter}
        filterCounts={filterCounts}
        onFilterChange={handleFilterChange}
      />

      {/* ── Loading skeleton ── */}
      {isLoading && (
        <section className={`glass-panel ${styles.loadingState}`}>
          <RefreshCw size={24} />
          <span>Loading games</span>
        </section>
      )}

      {error && (
        <section className={`glass-panel ${styles.errorState}`}>
          Could not load game history.
        </section>
      )}

      {!isLoading && !error && (
        <div
          style={{
            opacity: isFetching ? 0.55 : 1,
            transition: "opacity 0.15s",
          }}
        >
          <GameHistoryList games={games} />

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <span className={styles.paginationInfo}>
                Showing{" "}
                <strong>
                  {startItem}–{endItem}
                </strong>{" "}
                of <strong>{total}</strong> games
              </span>

              <div className={styles.paginationControls}>
                <button
                  type="button"
                  className={styles.pageBtn}
                  onClick={() => handlePage(page - 1)}
                  disabled={page === 1 || isFetching}
                >
                  <ChevronLeft size={14} /> Prev
                </button>

                <div className={styles.pageNumbers}>
                  {pageRange(page, totalPages).map((p, i) =>
                    p === "…" ? (
                      <span key={`ell-${i}`} className={styles.pageEllipsis}>
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        className={`${styles.pageNumber} ${p === page ? styles.pageNumberActive : ""}`}
                        onClick={() => p !== page && handlePage(p as number)}
                        disabled={isFetching}
                      >
                        {p}
                      </button>
                    ),
                  )}
                </div>

                <button
                  type="button"
                  className={styles.pageBtn}
                  onClick={() => handlePage(page + 1)}
                  disabled={page === totalPages || isFetching}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Empty state when no games match filter */}
          {!isFetching && games.length === 0 && !isLoading && (
            <section className={`glass-panel ${styles.emptyState}`}>
              <h2>No games found</h2>
              <p>No {filter !== "all" ? filter : "completed"} games to show.</p>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
