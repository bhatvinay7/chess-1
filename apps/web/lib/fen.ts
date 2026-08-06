export function toSafeFen(fen: string): string {
  if (!fen || fen === "startpos") return fen;
  try {
    const parts = fen.split(" ");
    if (parts.length >= 3) {
      if (parts[2] && parts[2] !== "-" && !/^[KQkqA-Ha-h]+$/.test(parts[2])) {
        parts[2] = "KQkq";
      }
    }
    return parts.join(" ");
  } catch {
    return fen;
  }
}
