"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "../../hooks/useAuth";
import {
  Swords,
  BarChart2,
  Bot,
  Trophy,
  Users,
  BookOpen,
  UserCircle,
  Clock,
  Zap,
} from "lucide-react";
import styles from "./Home.module.css";

const FEATURES = [
  {
    icon: <Swords size={28} />,
    title: "Live Matchmaking Arena",
    desc: "ELO-based pairing across 9 time controls — from 1-minute Bullet to 30-minute Rapid. Games start in seconds.",
  },
  {
    icon: <BarChart2 size={28} />,
    title: "Game Analysis",
    desc: "Review every game move-by-move with Stockfish engine evaluations, accuracy scores, and opening identification.",
  },
  {
    icon: <Bot size={28} />,
    title: "Play vs Bot",
    desc: "Practice against a Stockfish-powered bot at any strength. Post-game analysis highlights exactly where you went wrong.",
  },
  {
    icon: <Trophy size={28} />,
    title: "Tournaments",
    desc: "Swiss and Round Robin formats with double-header scheduling. Full standings, tiebreaks, and live round progression.",
  },
  {
    icon: <UserCircle size={28} />,
    title: "Rated Profile",
    desc: "Separate Bullet, Blitz, and Rapid ratings tracked over time. Win rate, streaks, and category charts on your profile.",
  },
  {
    icon: <Users size={28} />,
    title: "Clubs & Friends",
    desc: "Create or join clubs, add friends, and organise private games or club-level tournaments within your community.",
  },
];

const STEPS = [
  {
    n: "01",
    icon: <UserCircle size={22} />,
    title: "Create your account",
    desc: "Sign up in under a minute. Your rating starts at 1 200 and is recalibrated with every rated game you play.",
  },
  {
    n: "02",
    icon: <Clock size={22} />,
    title: "Pick a time control & queue",
    desc: "Choose Bullet, Blitz, or Rapid and rate/unrated, then hit Play. The arena matches you by ELO automatically.",
  },
  {
    n: "03",
    icon: <Zap size={22} />,
    title: "Play, review, and improve",
    desc: "After each game open the analysis board, study engine lines, and track how your rating moves over time.",
  },
];

const BOARD_PIECES = [
  "♜","","♝","♛","♚","♝","♞","♜",
  "♟","♟","♟","♟","","♟","♟","♟",
  "","","♞","","","","","",
  "","","","","♟","","","",
  "","","♗","","♙","","","",
  "","","","","","♘","","",
  "♙","♙","♙","♙","","♙","♙","♙",
  "♖","♘","♗","♕","♔","","","♖",
];

export default function HomePage() {
  const { user } = useAuth(null);
  const playRoute = user ? "/arena" : "/auth/login";

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <p className={styles.kicker}>Free · Rated · No download required</p>
            <h1 className={`${styles.title} premium-heading animate-fade-in`}>
              Chess the way it should be played.
            </h1>
            <p
              className={`${styles.subtitle} animate-fade-in`}
              style={{ animationDelay: "0.1s" }}
            >
              Rooky is a full-featured chess platform — live ELO matchmaking,
              Stockfish analysis, Swiss &amp; Round Robin tournaments, and a
              detailed player profile, all in one place.
            </p>
            <div
              className={`${styles.ctaGroup} animate-fade-in`}
              style={{ animationDelay: "0.2s" }}
            >
              <Link href={playRoute} className="btn-primary">
                Play Now
              </Link>
              <Link href="/tournament" className="btn-outline">
                Browse Tournaments
              </Link>
            </div>
          </div>

          <div className={styles.heroBoard} aria-hidden="true">
            {BOARD_PIECES.map((piece, i) => (
              <span key={i}>{piece}</span>
            ))}
          </div>
        </section>

        {/* ── Stats bar ────────────────────────────────────────────────────── */}
        <div className={styles.statsBar}>
          <div className={styles.stat}>
            <strong>9</strong>
            <span>Time controls</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <strong>3</strong>
            <span>Rating categories</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <strong>2</strong>
            <span>Tournament formats</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <strong>∞</strong>
            <span>Games to analyse</span>
          </div>
        </div>

        {/* ── Features ─────────────────────────────────────────────────────── */}
        <section className={styles.featuresSection}>
          <h2 className={styles.sectionTitle}>Everything you need to improve</h2>
          <div className={styles.features}>
            {FEATURES.map((f) => (
              <div key={f.title} className={styles.featureCard}>
                <div className={styles.iconWrapper}>{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────────────── */}
        <section className={styles.howSection}>
          <h2 className={styles.sectionTitle}>Up and running in 3 steps</h2>
          <div className={styles.steps}>
            {STEPS.map((s) => (
              <div key={s.n} className={styles.step}>
                <div className={styles.stepTop}>
                  <span className={styles.stepNum}>{s.n}</span>
                  <div className={styles.stepIcon}>{s.icon}</div>
                </div>
                <h3 className={styles.stepTitle}>{s.title}</h3>
                <p className={styles.stepDesc}>{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Coach callout ─────────────────────────────────────────────────── */}
        <section className={styles.coachBanner}>
          <div className={styles.coachText}>
            <BookOpen size={26} className={styles.coachIcon} />
            <div>
              <h3>Learn with Coach Mode</h3>
              <p>
                Step through guided puzzles and receive real-time hints after
                every move. Ideal for beginners building their first opening
                repertoire.
              </p>
            </div>
          </div>
          <Link href="/arena/coach" className="btn-primary">
                Try Coach Mode
              </Link>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>© {new Date().getFullYear()} Rooky — play, learn, compete.</p>
        <div className={styles.footerLinks}>
          <Link href="/history">Game History</Link>
          <Link href="/profile">Profile</Link>
          <Link href="/tournament">Tournaments</Link>
          <Link href="/clubs">Clubs</Link>
        </div>
      </footer>
    </div>
  );
}
