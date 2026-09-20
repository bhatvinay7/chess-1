pub fn build_pgn(moves: &[crate::types::MoveHistoryEntry]) -> String {
    let mut pgn = String::new();
    for (i, mv) in moves.iter().enumerate() {
        if i % 2 == 0 {
            pgn.push_str(&format!("{}. ", (i / 2) + 1));
        }
        let token = if mv.move_data.san.is_empty() {
            format!("{}{}", mv.move_data.from, mv.move_data.to)
        } else {
            mv.move_data.san.clone()
        };
        pgn.push_str(&token);
        pgn.push(' ');
    }
    pgn.trim_end().to_string()
}
