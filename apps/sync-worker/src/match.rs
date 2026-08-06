/// Swiss pairing via Edmonds' blossom MWPM (fusion-blossom).
///
/// Hard constraints: no repeat opponents, bye hygiene, no 3-same-colour runs.
/// Two-pass: strict colour first, then relaxed-colour fallback.
use fusion_blossom::mwpm_solver::LegacySolverSerial;
use fusion_blossom::util::{SolverInitializer, SyndromePattern};
use std::collections::HashSet;

#[derive(Clone, Debug, PartialEq, Copy)]
pub enum Color {
    White,
    Black,
}

#[derive(Clone, Debug)]
pub struct Player {
    pub id: usize,
    pub name: String,
    pub rating: i32,
    pub score: f32,
    pub history: Vec<usize>, // past opponent ids (same index space)
    pub color_history: Vec<Color>,
    pub received_bye: bool,
    pub is_dummy: bool,
}

#[derive(Debug)]
struct Edge {
    from: usize,
    to: usize,
    weight: i32,
}

/// Generate Swiss pairings.  Returns `(id_a, id_b)` pairs using Player.id values.
pub fn generate_pairings(mut players: Vec<Player>) -> Vec<(usize, usize)> {
    if !players.len().is_multiple_of(2) {
        let dummy_id = players.iter().map(|p| p.id).max().unwrap_or(0) + 1;
        players.push(Player {
            id: dummy_id,
            name: "BYE_GHOST".into(),
            rating: 0,
            score: 0.0,
            history: vec![],
            color_history: vec![],
            received_bye: false,
            is_dummy: true,
        });
    }

    players.sort_by(|a, b| {
        b.score
            .partial_cmp(&a.score)
            .unwrap()
            .then_with(|| b.rating.cmp(&a.rating))
    });

    let n = players.len();

    if let Some(p) = build_and_match(&players, n, true) {
        if p.len() == n / 2 {
            return map_indices_to_ids(&players, p);
        }
    }

    eprintln!("[swiss] strict colour pass failed — running relaxed fallback");
    if let Some(p) = build_and_match(&players, n, false) {
        return map_indices_to_ids(&players, p);
    }

    panic!("[swiss] MWPM failed completely");
}

fn build_and_match(
    players: &[Player],
    n: usize,
    strict_color: bool,
) -> Option<Vec<(usize, usize)>> {
    let top = &players[..n / 2];
    let bottom = &players[n / 2..];
    let mut edges: Vec<Edge> = Vec::new();

    for i in 0..n {
        for j in (i + 1)..n {
            let p1 = &players[i];
            let p2 = &players[j];

            if p1.history.contains(&p2.id) || p2.history.contains(&p1.id) {
                continue;
            }
            if p1.is_dummy && p2.received_bye {
                continue;
            }
            if p2.is_dummy && p1.received_bye {
                continue;
            }

            let col_viol = will_cause_three_consecutive(p1, p2);
            if strict_color && col_viol {
                continue;
            }

            let mut w: i32 = 2000;

            if p1.is_dummy || p2.is_dummy {
                let real = if p1.is_dummy { p2 } else { p1 };
                let idx = players.iter().position(|p| p.id == real.id).unwrap();
                w += idx as i32 * 20;
            } else {
                let p1_top = top.iter().any(|p| p.id == p1.id);
                let p2_top = top.iter().any(|p| p.id == p2.id);
                let t_idx = top
                    .iter()
                    .position(|p| p.id == p1.id)
                    .or_else(|| top.iter().position(|p| p.id == p2.id));
                let b_idx = bottom
                    .iter()
                    .position(|p| p.id == p1.id)
                    .or_else(|| bottom.iter().position(|p| p.id == p2.id));

                if p1_top != p2_top {
                    w += 500;
                    if let (Some(t), Some(b)) = (t_idx, b_idx) {
                        if t == b {
                            w += 1000;
                        }
                    }
                }
                w -= (p1.rating - p2.rating).abs() / 2;
                if wants_same_color(p1, p2) {
                    w -= 100;
                }
                if !strict_color && col_viol {
                    w -= 1500;
                }
            }

            if w < 1 {
                w = 1;
            }
            edges.push(Edge {
                from: i,
                to: j,
                weight: w,
            });
        }
    }

    let mut has_edge = vec![false; n];
    for e in &edges {
        has_edge[e.from] = true;
        has_edge[e.to] = true;
    }
    if has_edge.iter().any(|&h| !h) {
        return None;
    }

    let max_w = edges.iter().map(|e| e.weight).max().unwrap_or(0) + 1;
    let fb_edges: Vec<(usize, usize, isize)> = edges
        .iter()
        .map(|e| (e.from, e.to, (max_w - e.weight) as isize * 2))
        .collect();

    let init = SolverInitializer::new(n, fb_edges, vec![]);
    let defects: Vec<usize> = (0..n).collect();
    let result = LegacySolverSerial::mwpm_solve(&init, &SyndromePattern::new_vertices(defects));

    let mut seen = HashSet::new();
    let mut out = Vec::new();
    for i in 0..n {
        let j = result[i];
        if !seen.contains(&i) && !seen.contains(&j) {
            out.push((i, j));
            seen.insert(i);
            seen.insert(j);
        }
    }

    if out.len() == n / 2 {
        Some(out)
    } else {
        None
    }
}

fn map_indices_to_ids(players: &[Player], idx: Vec<(usize, usize)>) -> Vec<(usize, usize)> {
    idx.into_iter()
        .map(|(f, t)| (players[f].id, players[t].id))
        .collect()
}

// ── Colour allocation ─────────────────────────────────────────────────────────

pub fn allocate_colors(p1: &Player, p2: &Player) -> (Color, Color) {
    let b1 = color_balance(p1);
    let b2 = color_balance(p2);
    if b1 != b2 {
        return if b1 > b2 {
            (Color::Black, Color::White)
        } else {
            (Color::White, Color::Black)
        };
    }
    match (p1.color_history.last(), p2.color_history.last()) {
        (Some(Color::White), Some(Color::Black)) => (Color::Black, Color::White),
        (Some(Color::Black), Some(Color::White)) => (Color::White, Color::Black),
        _ => (Color::White, Color::Black),
    }
}

pub fn color_balance(p: &Player) -> i32 {
    let w = p
        .color_history
        .iter()
        .filter(|&&c| c == Color::White)
        .count() as i32;
    let b = p
        .color_history
        .iter()
        .filter(|&&c| c == Color::Black)
        .count() as i32;
    w - b
}

fn will_cause_three_consecutive(p1: &Player, p2: &Player) -> bool {
    if p1.is_dummy || p2.is_dummy {
        return false;
    }
    let last2_white = |p: &Player| {
        p.color_history
            .iter()
            .rev()
            .take(2)
            .filter(|&&c| c == Color::White)
            .count()
            == 2
    };
    let last2_black = |p: &Player| {
        p.color_history
            .iter()
            .rev()
            .take(2)
            .filter(|&&c| c == Color::Black)
            .count()
            == 2
    };
    (last2_white(p1) && last2_white(p2)) || (last2_black(p1) && last2_black(p2))
}

fn wants_same_color(p1: &Player, p2: &Player) -> bool {
    if p1.is_dummy || p2.is_dummy {
        return false;
    }
    let b1 = color_balance(p1);
    let b2 = color_balance(p2);
    (b1 > 0 && b2 > 0) || (b1 < 0 && b2 < 0)
}
