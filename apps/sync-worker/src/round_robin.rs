/// Round-robin pairing via the cyclic "polygon" method.
///
/// Algorithm:
///   Fix seat 0 permanently at the top of the table.
///   Place the remaining (n-1) players in a rotating sequence.
///   Each round, rotate that sequence one step clockwise.
///   Pair seat[i] with seat[n-1-i] for i in 0..n/2.
///
/// Odd n: a BYE dummy is appended at virtual seat index `n_players`.
///   Any pair where one member equals `n_players` is a bye for the other player.
///
/// Double-header: for each (a, b) pair the caller creates TWO games —
///   game 1: a = White, b = Black
///   game 2: a = Black, b = White

/// Pairings for a single round of a round-robin.
///
/// * `n_players` — real player count (BYE dummy injected internally if odd).
/// * `round`     — 0-indexed round number.
///
/// Returns `(seat_a, seat_b)` pairs where seats index into the original 0..n_players
/// slice.  A seat equal to `n_players` means BYE.
pub fn round_pairings(n_players: usize, round: usize) -> Vec<(usize, usize)> {
    let n = if n_players.is_multiple_of(2) {
        n_players
    } else {
        n_players + 1
    };
    // n is now even; seat n_players..n-1 are the BYE dummy (only one if odd)

    // Build the rotating ring for this round.
    // Seats 1..(n-1) rotate right by `round` positions each round.
    let rest: Vec<usize> = (1..n).collect();
    let rot = round % (n - 1);
    let split = n - 1 - rot; // right-rotate by `rot` = left-rotate by split

    let mut circle = vec![0usize; n];
    circle[0] = 0; // fixed seat
    let rotated: Vec<usize> = rest[split..]
        .iter()
        .chain(rest[..split].iter())
        .copied()
        .collect();
    circle[1..].copy_from_slice(&rotated);

    // Pair circle[i] with circle[n-1-i]
    (0..n / 2)
        .map(|i| {
            let a = circle[i];
            let b = circle[n - 1 - i];
            (a.min(b), a.max(b))
        })
        .collect()
}

/// Pre-compute **all** rounds of a round-robin schedule.
///
/// Useful for seeding future rounds in advance.
/// Returns a `Vec` of length `n_rounds` where each element is the list of
/// pairs for that round (same format as `round_pairings`).
pub fn full_schedule(n_players: usize) -> Vec<Vec<(usize, usize)>> {
    let n = if n_players.is_multiple_of(2) {
        n_players
    } else {
        n_players + 1
    };
    let n_rounds = n - 1;
    (0..n_rounds)
        .map(|r| round_pairings(n_players, r))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn four_players_all_opponents_covered() {
        // 4 players → 3 rounds; every player faces every other player exactly once
        let schedule = full_schedule(4);
        assert_eq!(schedule.len(), 3);

        let mut encounters: Vec<(usize, usize)> = Vec::new();
        for round in &schedule {
            for &pair in round {
                encounters.push(pair);
            }
        }

        // Each of the C(4,2)=6 unique pairs should appear exactly once
        let expected: Vec<(usize, usize)> = vec![(0, 1), (0, 2), (0, 3), (1, 2), (1, 3), (2, 3)];
        let mut sorted = encounters.clone();
        sorted.sort();
        assert_eq!(sorted, expected);
    }

    #[test]
    fn odd_players_bye_present() {
        // 3 players → padded to 4; 3 rounds; each round has one BYE (seat 3)
        let schedule = full_schedule(3);
        let n_players = 3;
        let bye_seat = n_players; // seat 3
        let byes: Vec<_> = schedule
            .iter()
            .flat_map(|r| r.iter())
            .filter(|&&(a, b)| a == bye_seat || b == bye_seat)
            .collect();
        assert_eq!(byes.len(), schedule.len()); // one bye per round
    }
}
