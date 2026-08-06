/**
 * Opening Book Worker
 *
 * Loads opening-book.json once in the background and answers FEN-lookup
 * requests from the main thread without blocking the UI.
 *
 * Message protocol (main → worker):
 *   { type: "init" }
 *   { type: "lookup", id: number, fen: string }
 *
 * Message protocol (worker → main):
 *   { type: "ready",  size: number }
 *   { type: "error",  message: string }
 *   { type: "lookup", id: number, move: string|null, name: string|null }
 */

let bookTree = null;

/** Strip halfmove clock + fullmove number so lookup matches the tree keys. */
function normFen(fen) {
  return fen.split(" ").slice(0, 4).join(" ");
}

async function loadBook() {
  try {
    // Primary source: bundled file served from /public
    const res = await fetch("/opening-book.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    bookTree = await res.json();
    self.postMessage({ type: "ready", size: Object.keys(bookTree).length });
  } catch (primaryErr) {
    // TODO: S3 fallback — uncomment and set NEXT_PUBLIC_BOOK_S3_URL env var
    // try {
    //   const s3 = await fetch(self.__S3_BOOK_URL__);
    //   if (!s3.ok) throw new Error(`S3 HTTP ${s3.status}`);
    //   bookTree = await s3.json();
    //   self.postMessage({ type: "ready", size: Object.keys(bookTree).length });
    //   return;
    // } catch (s3Err) { /* fall through */ }
    self.postMessage({ type: "error", message: String(primaryErr) });
  }
}

/**
 * Pick a random child from the current position.
 * Returns { move: string (SAN), name: string } or null if out of book.
 */
function lookupBookMove(fen) {
  if (!bookTree) return null;
  const node = bookTree[normFen(fen)];
  if (!node || !node.children || node.children.length === 0) return null;
  const child = node.children[Math.floor(Math.random() * node.children.length)];
  return { move: child.move, name: child.name };
}

self.onmessage = function (e) {
  const msg = e.data;

  if (msg.type === "init") {
    loadBook();
    return;
  }

  if (msg.type === "lookup") {
    const result = lookupBookMove(msg.fen);
    self.postMessage({
      type:  "lookup",
      id:    msg.id,
      move:  result?.move  ?? null,
      name:  result?.name  ?? null,
    });
    return;
  }

  // "hints" — return ALL children for the position (used by coach mode for hint display
  // and by engine to pick a random book move)
  if (msg.type === "hints") {
    if (!bookTree) {
      self.postMessage({ type: "hints", id: msg.id, hints: [], nodeName: null });
      return;
    }
    const key = normFen(msg.fen);
    const node = bookTree[key];
    self.postMessage({
      type:     "hints",
      id:       msg.id,
      hints:    node?.children ?? [],   // [{ move: SAN, fen, name }]
      nodeName: node?.name     ?? null,
    });
  }
};
