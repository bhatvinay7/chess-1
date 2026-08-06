use super::types::MatchPlayer;

/// Swiss: snake-draft into `n_groups`, remainders distributed to weakest groups first.
/// Players arrive pre-sorted score DESC, rating DESC.
pub(super) fn split_groups_swiss(
    players: Vec<MatchPlayer>,
    n_groups: usize,
) -> Vec<Vec<MatchPlayer>> {
    let mut groups: Vec<Vec<MatchPlayer>> = vec![vec![]; n_groups];
    let base = players.len() / n_groups;
    let mut iter = players.into_iter().enumerate();

    // Snake-draft the base allocation
    for (i, player) in iter.by_ref().take(base * n_groups) {
        let row = i / n_groups;
        let col = i % n_groups;
        let group_idx = if row.is_multiple_of(2) {
            col
        } else {
            n_groups - 1 - col
        };
        groups[group_idx].push(player);
    }

    // Remaining players: ascending score → weakest groups first
    let mut remainder: Vec<MatchPlayer> = iter.map(|(_, p)| p).collect();
    remainder.sort_by(|a, b| {
        a.score
            .partial_cmp(&b.score)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    for (i, player) in remainder.into_iter().enumerate() {
        groups[i % n_groups].push(player);
    }

    groups.retain(|g| !g.is_empty());
    groups
}

/// Round Robin: sequential windows of `group_size`; last window may be smaller.
pub(super) fn split_groups_round_robin(
    players: Vec<MatchPlayer>,
    group_size: usize,
) -> Vec<Vec<MatchPlayer>> {
    players.chunks(group_size).map(|c| c.to_vec()).collect()
}
