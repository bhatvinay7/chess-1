/// chess960.rs — Fischer Random (Chess960) starting-position generator
///
/// Implements the **official FIDE Chess960 SP-ID algorithm** (positions 0–959)
/// that guarantees:
///   • Bishops on opposite colour squares
///   • King between the two rooks (enables O-O / O-O-O)
///   • Queen placed in any remaining slot
///   • Knights fill the last two squares
///
/// Outputs a standard FEN string with X-FEN castling tokens so engines and
/// the frontend can parse it without modification.
///
/// # Quick usage
/// ```
/// let pos = chess960::random();       // random position
/// let pos = chess960::generate(518);  // SP 518 = standard chess
/// println!("{}", pos.fen);            // full FEN ready for Redis / Postgres
/// ```
use std::fmt;

// ─── Public types ────────────────────────────────────────────────────────────

/// A fully described Chess960 starting position.
#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct Chess960Position {
    /// SP-ID in range 0..=959
    pub id: u16,
    /// Back-rank piece layout for White (index 0 = a-file)
    pub pieces: [Piece; 8],
    /// Complete FEN string (position + side + castling + ep + clocks)
    pub fen: String,
    /// X-FEN castling string (e.g. "KQkq" for standard, "HAha" for 960)
    pub castling: String,
}

impl fmt::Display for Chess960Position {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "SP-{:03} | FEN: {}", self.id, self.fen)
    }
}

/// Single piece kind.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Piece {
    King,
    Queen,
    Rook,
    Bishop,
    Knight,
}

impl Piece {
    /// Uppercase FEN letter (White).
    fn fen_char(self) -> char {
        match self {
            Piece::King => 'K',
            Piece::Queen => 'Q',
            Piece::Rook => 'R',
            Piece::Bishop => 'B',
            Piece::Knight => 'N',
        }
    }
}

// ─── Core algorithm ──────────────────────────────────────────────────────────

/// Generate the Chess960 starting position for the given SP-ID (0–959).
///
/// # Panics
/// Panics if `id > 959`.
pub fn generate(id: u16) -> Chess960Position {
    assert!(
        id <= 959,
        "Chess960 SP-ID must be in range 0..=959, got {}",
        id
    );

    let mut squares: [Option<Piece>; 8] = [None; 8];
    let mut n = id;

    // ── Step 1: Dark-square bishop (b1 / d1 / f1 / h1 → files 1,3,5,7) ──
    let dark_bishop_file = (n % 4) * 2 + 1;
    squares[dark_bishop_file as usize] = Some(Piece::Bishop);
    n /= 4;

    // ── Step 2: Light-square bishop (a1 / c1 / e1 / g1 → files 0,2,4,6) ──
    let light_bishop_file = (n % 4) * 2;
    squares[light_bishop_file as usize] = Some(Piece::Bishop);
    n /= 4;

    // ── Step 3: Queen in one of the 6 remaining empty squares ──
    let queen_slot = n % 6;
    n /= 6;
    place_in_nth_empty(&mut squares, queen_slot as usize, Piece::Queen);

    // ── Step 4: Knights ───────────────────────────────────────────────────
    // Snapshot all 5 remaining empty file-indices BEFORE placing any knight.
    // KNIGHT_TABLE slots refer to this original 5-element list, so we must
    // not use sequential place_in_nth_empty (it shrinks the list and shifts
    // the second index, corrupting the result).
    let (ka, kb) = KNIGHT_TABLE[n as usize];
    let empty5: Vec<usize> = squares
        .iter()
        .enumerate()
        .filter(|(_, s)| s.is_none())
        .map(|(i, _)| i)
        .collect();
    debug_assert_eq!(empty5.len(), 5, "expected 5 empty squares before knights");
    squares[empty5[ka]] = Some(Piece::Knight);
    squares[empty5[kb]] = Some(Piece::Knight);

    // ── Step 5: Rook · King · Rook in the three remaining squares (fixed order) ──
    place_in_nth_empty(&mut squares, 0, Piece::Rook);
    place_in_nth_empty(&mut squares, 0, Piece::King);
    place_in_nth_empty(&mut squares, 0, Piece::Rook);

    // Unwrap — every square is guaranteed to be filled.
    let pieces: [Piece; 8] = squares.map(|s| s.expect("BUG: empty square after placement"));

    // ── Build FEN ──
    let castling = castling_string(&pieces);
    let fen = build_fen(&pieces, &castling);

    Chess960Position {
        id,
        pieces,
        fen,
        castling,
    }
}

/// Generate a random Chess960 position using a simple LCG seeded from the
/// system clock.  No external `rand` dependency required.
pub fn random() -> Chess960Position {
    let seed = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .subsec_nanos();
    // LCG: same constants as glibc / Numerical Recipes
    let id = ((seed.wrapping_mul(1_664_525).wrapping_add(1_013_904_223) >> 16) % 960) as u16;
    generate(id)
}

/// Generate a random position and return only the FEN string.
/// Convenience wrapper for the matchmaker call-site.
pub fn random_fen() -> String {
    random().fen
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/// Place `piece` into the `n`-th currently-empty slot (0-indexed).
fn place_in_nth_empty(squares: &mut [Option<Piece>; 8], n: usize, piece: Piece) {
    let mut count = 0;
    for sq in squares.iter_mut() {
        if sq.is_none() {
            if count == n {
                *sq = Some(piece);
                return;
            }
            count += 1;
        }
    }
    panic!(
        "BUG: not enough empty squares to place {:?} at slot {}",
        piece, n
    );
}

/// Knight placement table: maps the encoded value (0–9) to a pair of
/// zero-based indices into the *remaining* 5 empty squares after queens.
/// Source: FIDE Chess960 specification appendix.
const KNIGHT_TABLE: [(usize, usize); 10] = [
    (0, 1), // NN....
    (0, 2), // N.N...
    (0, 3), // N..N..
    (0, 4), // N...N.
    (1, 2), // .NN...
    (1, 3), // .N.N..
    (1, 4), // .N..N.
    (2, 3), // ..NN..
    (2, 4), // ..N.N.
    (3, 4), // ...NN.
];

/// Build the X-FEN castling token.
///
/// Standard FEN uses "KQkq"; X-FEN for Chess960 uses the **file letter** of
/// each rook instead when the position is non-standard.  
/// SP 518 (the classic layout) still emits "KQkq".
fn castling_string(pieces: &[Piece; 8]) -> String {
    // Find king file and rook files.
    let king_file = pieces.iter().position(|&p| p == Piece::King).unwrap();
    let rook_files: Vec<usize> = pieces
        .iter()
        .enumerate()
        .filter(|(_, &p)| p == Piece::Rook)
        .map(|(i, _)| i)
        .collect();

    // Left rook (queen-side) < king < right rook (king-side)
    let qs_rook = rook_files[0]; // always the smaller index
    let ks_rook = rook_files[1]; // always the larger index

    // Classic layout: K on e1 (file 4), rooks on a1 & h1 (files 0 & 7).
    let is_classic = king_file == 4 && qs_rook == 0 && ks_rook == 7;

    if is_classic {
        "KQkq".to_string()
    } else {
        // X-FEN: uppercase for White castling, lowercase for Black.
        let ks_char = (b'A' + ks_rook as u8) as char; // e.g. 'H'
        let qs_char = (b'A' + qs_rook as u8) as char; // e.g. 'A'
        let ks_lower = ks_char.to_ascii_lowercase();
        let qs_lower = qs_char.to_ascii_lowercase();
        format!("{}{}{}{}", ks_char, qs_char, ks_lower, qs_lower)
    }
}

/// Assemble the complete FEN string for a Chess960 starting position.
///
/// Format: `<rank8>/<rank7>/.../<rank1> w <castling> - 0 1`
fn build_fen(pieces: &[Piece; 8], castling: &str) -> String {
    // White back rank (rank 1)
    let rank1: String = pieces.iter().map(|p| p.fen_char()).collect();

    // Black back rank (rank 8) — same layout, lowercase
    let rank8: String = pieces
        .iter()
        .map(|p| p.fen_char().to_ascii_lowercase())
        .collect();

    format!("{rank8}/pppppppp/8/8/8/8/PPPPPPPP/{rank1} w {castling} - 0 1")
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sp518_is_standard_chess() {
        let pos = generate(518);
        assert_eq!(
            pos.fen,
            "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
        );
        assert_eq!(pos.castling, "KQkq");
    }

    #[test]
    fn all_positions_have_correct_piece_counts() {
        for id in 0u16..=959 {
            let pos = generate(id);
            let kings = pos.pieces.iter().filter(|&&p| p == Piece::King).count();
            let queens = pos.pieces.iter().filter(|&&p| p == Piece::Queen).count();
            let rooks = pos.pieces.iter().filter(|&&p| p == Piece::Rook).count();
            let bishops = pos.pieces.iter().filter(|&&p| p == Piece::Bishop).count();
            let knights = pos.pieces.iter().filter(|&&p| p == Piece::Knight).count();
            assert_eq!(kings, 1, "SP-{id}: wrong king count");
            assert_eq!(queens, 1, "SP-{id}: wrong queen count");
            assert_eq!(rooks, 2, "SP-{id}: wrong rook count");
            assert_eq!(bishops, 2, "SP-{id}: wrong bishop count");
            assert_eq!(knights, 2, "SP-{id}: wrong knight count");
        }
    }

    #[test]
    fn bishops_always_on_opposite_colours() {
        for id in 0u16..=959 {
            let pos = generate(id);
            let bishop_files: Vec<usize> = pos
                .pieces
                .iter()
                .enumerate()
                .filter(|(_, &p)| p == Piece::Bishop)
                .map(|(i, _)| i)
                .collect();
            assert_eq!(bishop_files.len(), 2, "SP-{id}: expected 2 bishops");
            // One file must be even, the other odd (opposite colours).
            assert_ne!(
                bishop_files[0] % 2,
                bishop_files[1] % 2,
                "SP-{id}: bishops on same colour squares (files {:?})",
                bishop_files
            );
        }
    }

    #[test]
    fn king_always_between_rooks() {
        for id in 0u16..=959 {
            let pos = generate(id);
            let king_file = pos.pieces.iter().position(|&p| p == Piece::King).unwrap();
            let rook_files: Vec<usize> = pos
                .pieces
                .iter()
                .enumerate()
                .filter(|(_, &p)| p == Piece::Rook)
                .map(|(i, _)| i)
                .collect();
            let qs = rook_files[0].min(rook_files[1]);
            let ks = rook_files[0].max(rook_files[1]);
            assert!(
                qs < king_file && king_file < ks,
                "SP-{id}: king not between rooks (king={king_file}, rooks={qs},{ks})"
            );
        }
    }

    #[test]
    fn fen_parses_to_correct_back_rank() {
        // Pick a few known positions and verify the rank-1 piece string.
        // SP-0:  BBQNNRKR  (bishops on b1/c1, queen on d1, …)
        let sp0 = generate(0);
        let rank1: String = sp0.pieces.iter().map(|p| p.fen_char()).collect();
        assert_eq!(rank1, "BBQNNRKR", "SP-0 back rank mismatch: {rank1}");

        let sp959 = generate(959);
        let rank1_959: String = sp959.pieces.iter().map(|p| p.fen_char()).collect();
        assert_eq!(
            rank1_959, "RKRNNQBB",
            "SP-959 back rank mismatch: {rank1_959}"
        );
    }

    #[test]
    fn random_fen_is_valid_960_fen() {
        let fen = random_fen();
        // Must have 6 space-separated fields.
        let fields: Vec<&str> = fen.split_whitespace().collect();
        assert_eq!(fields.len(), 6, "FEN should have 6 fields: {fen}");
        // Side to move must be White.
        assert_eq!(fields[1], "w", "side to move should be 'w': {fen}");
        // Move clocks must be "0 1".
        assert_eq!(fields[4], "0");
        assert_eq!(fields[5], "1");
    }
}
