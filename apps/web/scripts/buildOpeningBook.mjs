/**
 * buildOpeningBook.mjs
 *
 * Reads public/merged-*.json (flat FEN → {name, eco, moves} map),
 * builds a parent-child indexed tree keyed by normalised FEN
 * (pieces + turn + castling + en-passant, no move counters),
 * and writes the result to public/opening-book.json.
 *
 * Run:  node scripts/buildOpeningBook.mjs
 *   or: pnpm book
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { Chess } from "../../../node_modules/.pnpm/chess.js@1.4.0/node_modules/chess.js/dist/esm/chess.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const INPUT  = resolve(ROOT, "public", "merged-1781161812189.json");
const OUTPUT = resolve(ROOT, "public", "opening-book.json");

/* ── helpers ──────────────────────────────────────────────────────────────── */

/** Strip halfmove clock + fullmove number so positions compare by structure. */
function normFen(fen) {
  return fen.split(" ").slice(0, 4).join(" ");
}

/**
 * Strip move numbers ("1." / "1..." / "12.") and split on whitespace,
 * returning only the SAN tokens.
 */
function parseMoves(movesStr) {
  return movesStr
    .replace(/\d+\.+/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/* ── phase 1: initialise every node ──────────────────────────────────────── */

console.log("Reading", INPUT);
const raw = JSON.parse(readFileSync(INPUT, "utf8"));
const entries = Object.entries(raw); // [ [fullFen, {name,eco,moves,...}] ]
console.log(`  ${entries.length} openings loaded`);

/** @type {Map<string, {name:string, eco:string, moves:string, children:{move:string,fen:string,name:string}[]}>} */
const tree = new Map();

for (const [fullFen, meta] of entries) {
  const key = normFen(fullFen);
  if (!tree.has(key)) {
    tree.set(key, {
      name:     meta.name  ?? "",
      eco:      meta.eco   ?? "",
      moves:    meta.moves ?? "",
      children: [],
    });
  } else {
    // Prefer the entry that carries more specific data (longer moves string = deeper line)
    const existing = tree.get(key);
    if ((meta.moves ?? "").length > existing.moves.length) {
      existing.name  = meta.name  ?? existing.name;
      existing.eco   = meta.eco   ?? existing.eco;
      existing.moves = meta.moves ?? existing.moves;
    }
  }
}

console.log(`  ${tree.size} unique normalised positions`);

/* ── phase 2: replay every line and wire parent → child links ────────────── */

const START_FEN = normFen(new Chess().fen());

// Ensure the root node exists (starting position may not be in the file)
if (!tree.has(START_FEN)) {
  tree.set(START_FEN, { name: "Starting Position", eco: "", moves: "", children: [] });
}

let linked = 0;
let skipped = 0;

for (const [, node] of tree) {
  if (!node.moves) continue;

  const chess     = new Chess();
  const moveList  = parseMoves(node.moves);
  let   parentFen = START_FEN;

  for (const san of moveList) {
    let result;
    try {
      result = chess.move(san);
    } catch {
      skipped++;
      break;
    }

    const childFen = normFen(chess.fen());

    // Look up the child node (may not exist if this depth is the deepest for this line)
    const childNode = tree.get(childFen);

    const parentNode = tree.get(parentFen);
    if (parentNode) {
      const alreadyLinked = parentNode.children.some((c) => c.fen === childFen);
      if (!alreadyLinked) {
        parentNode.children.push({
          move: result.san,
          fen:  childFen,
          name: childNode?.name ?? "Theoretical Continuation",
        });
        linked++;
      }
    }

    parentFen = childFen;
  }
}

console.log(`  ${linked} parent→child links built  (${skipped} malformed move strings skipped)`);

/* ── phase 3: serialise Map → plain object and write ─────────────────────── */

// Convert Map to a plain object for JSON serialisation
const out = Object.fromEntries(tree);

console.log("Writing", OUTPUT);
writeFileSync(OUTPUT, JSON.stringify(out), "utf8");

const sizeMb = (Buffer.byteLength(JSON.stringify(out)) / 1024 / 1024).toFixed(2);
console.log(`Done — ${Object.keys(out).length} nodes, ~${sizeMb} MB`);
