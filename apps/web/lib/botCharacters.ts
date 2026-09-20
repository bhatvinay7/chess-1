export interface BotCharacter {
  id: string;
  name: string;
  title: string;
  elo: number;
  description: string;
  avatar: string;
  accentColor: string;
  skillLevel: number; // Stockfish UCI Skill Level 0-20
  depth: number; // Stockfish search depth
}

export const BOT_CHARACTERS: BotCharacter[] = [
  {
    id: "pawn",
    name: "Pawn Pete",
    title: "Beginner",
    elo: 400,
    description: "Just learning the game. Perfect for new players.",
    avatar: "♟",
    accentColor: "#6aaa44",
    skillLevel: 1,
    depth: 3,
  },
  {
    id: "knight",
    name: "Knighty",
    title: "Novice",
    elo: 800,
    description: "Knows the basics but stumbles on tactics.",
    avatar: "♞",
    accentColor: "#4a90d9",
    skillLevel: 5,
    depth: 5,
  },
  {
    id: "bishop",
    name: "Bishop Blake",
    title: "Casual",
    elo: 1100,
    description: "Solid positional play with occasional blunders.",
    avatar: "♝",
    accentColor: "#d4a017",
    skillLevel: 8,
    depth: 8,
  },
  {
    id: "rook",
    name: "Rook Rex",
    title: "Intermediate",
    elo: 1400,
    description: "Reliable and consistent. Punishes mistakes.",
    avatar: "♜",
    accentColor: "#c0392b",
    skillLevel: 12,
    depth: 10,
  },
  {
    id: "queen",
    name: "Queen Quorra",
    title: "Advanced",
    elo: 1700,
    description: "Sharp tactician. Very hard to beat.",
    avatar: "♛",
    accentColor: "#9b59b6",
    skillLevel: 17,
    depth: 12,
  },
  {
    id: "king",
    name: "King Kayne",
    title: "Master",
    elo: 2200,
    description: "Near-perfect play. Only for the brave.",
    avatar: "♚",
    accentColor: "#e67e22",
    skillLevel: 20,
    depth: 14,
  },
  {
    id: "grandmaster",
    name: "Grand Viktor",
    title: "Grandmaster",
    elo: 2500,
    description:
      "Grandmaster-level precision. No blunders, deep calculation, unforgiving endgames.",
    avatar: "🏆",
    accentColor: "#f0c040",
    skillLevel: 20,
    depth: 16,
  },
  {
    id: "turing",
    name: "Alan T.",
    title: "Super-GM",
    elo: 2800,
    description:
      "Engine at full power. Virtually unbeatable — play for the experience.",
    avatar: "🤖",
    accentColor: "#00d4ff",
    skillLevel: 20,
    depth: 18,
  },
];
