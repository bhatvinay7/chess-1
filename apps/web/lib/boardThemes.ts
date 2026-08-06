export interface BoardThemeColors {
  light: string;
  dark: string;
  accent: string;
  accentSoft: string;
}

export interface BoardTheme {
  id: string;
  name: string;
  colors: BoardThemeColors;
}

// 35 themes — 7 columns × 5 rows — matching chess.com board & pieces grid
export const BOARD_THEMES: BoardTheme[] = [
  // ── Row 1: Greens ──────────────────────────────────────────────────────
  {
    id: "green",
    name: "Classic Green",
    colors: { light: "#f0f5e8", dark: "#7ca35f", accent: "#7ca35f", accentSoft: "rgba(124,163,95,0.16)" },
  },
  {
    id: "green-dark",
    name: "Dark Forest",
    colors: { light: "#d0e8c0", dark: "#4a7543", accent: "#4a7543", accentSoft: "rgba(74,117,67,0.16)" },
  },
  {
    id: "green-mint",
    name: "Mint Fresh",
    colors: { light: "#e0f5ee", dark: "#4ba889", accent: "#4ba889", accentSoft: "rgba(75,168,137,0.16)" },
  },
  {
    id: "sage",
    name: "Sage",
    colors: { light: "#e5ede5", dark: "#7a9e7e", accent: "#7a9e7e", accentSoft: "rgba(122,158,126,0.16)" },
  },
  {
    id: "olive",
    name: "Olive Garden",
    colors: { light: "#e8ecce", dark: "#6b7c35", accent: "#6b7c35", accentSoft: "rgba(107,124,53,0.16)" },
  },
  {
    id: "moss",
    name: "Moss",
    colors: { light: "#dde8d5", dark: "#587550", accent: "#587550", accentSoft: "rgba(88,117,80,0.16)" },
  },
  {
    id: "forest",
    name: "Pine Forest",
    colors: { light: "#c8e0c0", dark: "#3a6040", accent: "#3a6040", accentSoft: "rgba(58,96,64,0.16)" },
  },

  // ── Row 2: Browns & Wood ───────────────────────────────────────────────
  {
    id: "brown",
    name: "Classic Brown",
    colors: { light: "#f0d9b5", dark: "#b58863", accent: "#b58863", accentSoft: "rgba(181,136,99,0.16)" },
  },
  {
    id: "wood",
    name: "Walnut",
    colors: { light: "#f3dfc1", dark: "#9b6b43", accent: "#9b6b43", accentSoft: "rgba(155,107,67,0.18)" },
  },
  {
    id: "mahogany",
    name: "Mahogany",
    colors: { light: "#f5deb3", dark: "#8b4513", accent: "#8b4513", accentSoft: "rgba(139,69,19,0.16)" },
  },
  {
    id: "tan",
    name: "Desert Tan",
    colors: { light: "#fdf3d0", dark: "#c4a265", accent: "#c4a265", accentSoft: "rgba(196,162,101,0.16)" },
  },
  {
    id: "orange",
    name: "Golden Sand",
    colors: { light: "#fff2dc", dark: "#d99b5e", accent: "#e0a15d", accentSoft: "rgba(224,161,93,0.16)" },
  },
  {
    id: "amber",
    name: "Amber Glow",
    colors: { light: "#fef0cc", dark: "#c88b30", accent: "#c88b30", accentSoft: "rgba(200,139,48,0.16)" },
  },
  {
    id: "cream",
    name: "Ivory",
    colors: { light: "#fffaf0", dark: "#d4b896", accent: "#d4b896", accentSoft: "rgba(212,184,150,0.16)" },
  },

  // ── Row 3: Blues ────────────────────────────────────────────────────────
  {
    id: "blue",
    name: "Royal Blue",
    colors: { light: "#eef6fb", dark: "#6c9bcf", accent: "#6c9bcf", accentSoft: "rgba(108,155,207,0.16)" },
  },
  {
    id: "blue-dark",
    name: "Deep Navy",
    colors: { light: "#d0e0f0", dark: "#3a6090", accent: "#3a6090", accentSoft: "rgba(58,96,144,0.16)" },
  },
  {
    id: "slate-blue",
    name: "Slate Blue",
    colors: { light: "#e0eaf8", dark: "#5b7fa8", accent: "#5b7fa8", accentSoft: "rgba(91,127,168,0.16)" },
  },
  {
    id: "sky",
    name: "Sky Blue",
    colors: { light: "#e8f4ff", dark: "#5b9bd5", accent: "#5b9bd5", accentSoft: "rgba(91,155,213,0.16)" },
  },
  {
    id: "arctic",
    name: "Arctic",
    colors: { light: "#eaf8ff", dark: "#6bbcdf", accent: "#6bbcdf", accentSoft: "rgba(107,188,223,0.16)" },
  },
  {
    id: "navy",
    name: "Dark Navy",
    colors: { light: "#d0d8f0", dark: "#2a3a5e", accent: "#2a3a5e", accentSoft: "rgba(42,58,94,0.16)" },
  },
  {
    id: "dusk",
    name: "Dusk",
    colors: { light: "#e8e0f5", dark: "#6a5ab0", accent: "#6a5ab0", accentSoft: "rgba(106,90,176,0.16)" },
  },

  // ── Row 4: Teals, Neutrals & Slates ────────────────────────────────────
  {
    id: "teal",
    name: "Ocean Teal",
    colors: { light: "#d8f0f5", dark: "#4a8fa8", accent: "#4a8fa8", accentSoft: "rgba(74,143,168,0.16)" },
  },
  {
    id: "cyan",
    name: "Cyan",
    colors: { light: "#d0f0ec", dark: "#2a9d8f", accent: "#2a9d8f", accentSoft: "rgba(42,157,143,0.16)" },
  },
  {
    id: "dark",
    name: "Midnight Slate",
    colors: { light: "#d8d8d8", dark: "#5f6368", accent: "#8b949e", accentSoft: "rgba(139,148,158,0.16)" },
  },
  {
    id: "charcoal",
    name: "Charcoal",
    colors: { light: "#c8c8c8", dark: "#4a4a4a", accent: "#4a4a4a", accentSoft: "rgba(74,74,74,0.16)" },
  },
  {
    id: "gray-warm",
    name: "Warm Stone",
    colors: { light: "#e8e0d0", dark: "#8a8070", accent: "#8a8070", accentSoft: "rgba(138,128,112,0.16)" },
  },
  {
    id: "gray-cool",
    name: "Cool Slate",
    colors: { light: "#dce8f0", dark: "#7a8a98", accent: "#7a8a98", accentSoft: "rgba(122,138,152,0.16)" },
  },
  {
    id: "rust",
    name: "Rust",
    colors: { light: "#f5e0d0", dark: "#b05030", accent: "#b05030", accentSoft: "rgba(176,80,48,0.16)" },
  },

  // ── Row 5: Warm & Bold ──────────────────────────────────────────────────
  {
    id: "coral",
    name: "Coral",
    colors: { light: "#ffe8dc", dark: "#e07850", accent: "#e07850", accentSoft: "rgba(224,120,80,0.16)" },
  },
  {
    id: "maroon",
    name: "Bordeaux",
    colors: { light: "#f5d8d8", dark: "#8b2635", accent: "#8b2635", accentSoft: "rgba(139,38,53,0.16)" },
  },
  {
    id: "red",
    name: "Crimson",
    colors: { light: "#fce0e0", dark: "#c84040", accent: "#c84040", accentSoft: "rgba(200,64,64,0.16)" },
  },
  {
    id: "purple",
    name: "Royal Purple",
    colors: { light: "#ede0f8", dark: "#7b5ea7", accent: "#7b5ea7", accentSoft: "rgba(123,94,167,0.16)" },
  },
  {
    id: "lavender",
    name: "Lavender",
    colors: { light: "#f0edf8", dark: "#8878c0", accent: "#8878c0", accentSoft: "rgba(136,120,192,0.16)" },
  },
  {
    id: "grape",
    name: "Grape",
    colors: { light: "#e8d8f0", dark: "#6a3a80", accent: "#6a3a80", accentSoft: "rgba(106,58,128,0.16)" },
  },
  {
    id: "pink",
    name: "Rose",
    colors: { light: "#fce8f0", dark: "#c87898", accent: "#c87898", accentSoft: "rgba(200,120,152,0.16)" },
  },
];

export const DEFAULT_THEME_ID = "green";
