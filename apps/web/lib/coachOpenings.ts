export interface CoachOpening {
  id: string;
  name: string;
  eco: string;
  description: string;
  playerColor: "white" | "black";
  emoji: string;
  accentColor: string;
  category: "open" | "semi-open" | "closed" | "semi-closed" | "flank";
}

export const COACH_OPENINGS: CoachOpening[] = [
  // ── White Openings ──────────────────────────────────────────────────────
  {
    id: "ruy-lopez",
    name: "Ruy López",
    eco: "C60",
    description:
      "The most classical 1.e4 opening. Control the center and pressure the e5 pawn.",
    playerColor: "white",
    emoji: "⚔️",
    accentColor: "#c0392b",
    category: "open",
  },
  {
    id: "italian",
    name: "Italian Game",
    eco: "C50",
    description:
      "Fast development targeting f7. Rich positional and tactical play.",
    playerColor: "white",
    emoji: "🏛️",
    accentColor: "#e67e22",
    category: "open",
  },
  {
    id: "kings-gambit",
    name: "King's Gambit",
    eco: "C30",
    description:
      "Sacrifice a pawn for explosive center control and rapid development.",
    playerColor: "white",
    emoji: "🔥",
    accentColor: "#e74c3c",
    category: "open",
  },
  {
    id: "vienna",
    name: "Vienna Game",
    eco: "C25",
    description:
      "Flexible and tricky. Avoid early theory while keeping good play.",
    playerColor: "white",
    emoji: "🎻",
    accentColor: "#9b59b6",
    category: "open",
  },
  {
    id: "four-knights",
    name: "Four Knights Game",
    eco: "C46",
    description:
      "Symmetrical development of all minor pieces. Classical and solid.",
    playerColor: "white",
    emoji: "♞",
    accentColor: "#2980b9",
    category: "open",
  },
  {
    id: "queens-gambit",
    name: "Queen's Gambit",
    eco: "D20",
    description:
      "The cornerstone of 1.d4 openings. Fight for the center with c4.",
    playerColor: "white",
    emoji: "♛",
    accentColor: "#27ae60",
    category: "closed",
  },
  {
    id: "london",
    name: "London System",
    eco: "D02",
    description:
      "Solid, reliable, and low on theory. Build a strong pawn structure.",
    playerColor: "white",
    emoji: "🏰",
    accentColor: "#7f8c8d",
    category: "closed",
  },
  {
    id: "catalan",
    name: "Catalan Opening",
    eco: "E00",
    description:
      "Combine the Queen's Gambit with a fianchettoed bishop. Long-term pressure.",
    playerColor: "white",
    emoji: "🔶",
    accentColor: "#f39c12",
    category: "closed",
  },
  {
    id: "english",
    name: "English Opening",
    eco: "A10",
    description:
      "Hypermodern flank opening. Control the center with pieces, not pawns.",
    playerColor: "white",
    emoji: "🌿",
    accentColor: "#1abc9c",
    category: "flank",
  },
  {
    id: "colle",
    name: "Colle System",
    eco: "D05",
    description:
      "A solid d4 system ideal for beginners. Consistent setup with attack potential.",
    playerColor: "white",
    emoji: "🧱",
    accentColor: "#795548",
    category: "closed",
  },

  // ── Black Openings ───────────────────────────────────────────────────────
  {
    id: "sicilian",
    name: "Sicilian Defense",
    eco: "B20",
    description:
      "The most popular and combative Black response to 1.e4. Rich in theory.",
    playerColor: "black",
    emoji: "🐉",
    accentColor: "#8e44ad",
    category: "semi-open",
  },
  {
    id: "french",
    name: "French Defense",
    eco: "C00",
    description:
      "Solid and counterattacking. Accept a space disadvantage for long-term chances.",
    playerColor: "black",
    emoji: "🗼",
    accentColor: "#2980b9",
    category: "semi-open",
  },
  {
    id: "caro-kann",
    name: "Caro-Kann Defense",
    eco: "B10",
    description:
      "Solid and reliable against 1.e4. Avoid weak pawns while keeping a good bishop.",
    playerColor: "black",
    emoji: "🛡️",
    accentColor: "#16a085",
    category: "semi-open",
  },
  {
    id: "scandinavian",
    name: "Scandinavian Defense",
    eco: "B01",
    description:
      "Challenge the center immediately with 1…d5. Simple to learn and solid.",
    playerColor: "black",
    emoji: "⚡",
    accentColor: "#2ecc71",
    category: "semi-open",
  },
  {
    id: "kings-indian",
    name: "King's Indian Defense",
    eco: "E60",
    description:
      "Allow White to build a big center, then counterattack with …e5 or …c5.",
    playerColor: "black",
    emoji: "🏹",
    accentColor: "#e67e22",
    category: "semi-closed",
  },
  {
    id: "nimzo-indian",
    name: "Nimzo-Indian Defense",
    eco: "E20",
    description:
      "Pin the knight with the bishop to disrupt White's center. Very dynamic.",
    playerColor: "black",
    emoji: "📌",
    accentColor: "#c0392b",
    category: "semi-closed",
  },
  {
    id: "queens-indian",
    name: "Queen's Indian Defense",
    eco: "E12",
    description:
      "Hypermodern defense. Fianchetto the queenside bishop to control e4.",
    playerColor: "black",
    emoji: "👑",
    accentColor: "#f39c12",
    category: "semi-closed",
  },
  {
    id: "grunfeld",
    name: "Grünfeld Defense",
    eco: "D70",
    description:
      "Let White have the center, then attack it with pieces. Highly theoretical.",
    playerColor: "black",
    emoji: "🎯",
    accentColor: "#9b59b6",
    category: "semi-closed",
  },
  {
    id: "slav",
    name: "Slav Defense",
    eco: "D10",
    description:
      "Solid defense against 1.d4. Keep the c8 bishop active from the start.",
    playerColor: "black",
    emoji: "🗡️",
    accentColor: "#34495e",
    category: "semi-closed",
  },
  {
    id: "dutch",
    name: "Dutch Defense",
    eco: "A80",
    description:
      "Aggressive and unbalanced. Fight for e4 from move one with 1…f5.",
    playerColor: "black",
    emoji: "🌷",
    accentColor: "#e74c3c",
    category: "flank",
  },
];
