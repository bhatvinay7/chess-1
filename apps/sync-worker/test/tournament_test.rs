use sync_worker::r#match::{generate_pairings, allocate_colors, Player, Color};

#[test]
fn test_allocate_colors_balance() {
    let p1 = Player {
        id: 1, name: "P1".into(), rating: 1200, score: 0.0,
        history: vec![], color_history: vec![Color::White, Color::White],
        received_bye: false, is_dummy: false,
    };
    let p2 = Player {
        id: 2, name: "P2".into(), rating: 1200, score: 0.0,
        history: vec![], color_history: vec![Color::Black, Color::Black],
        received_bye: false, is_dummy: false,
    };

    // p1 has played 2 Whites (balance +2)
    // p2 has played 2 Blacks (balance -2)
    // So p1 should get Black, p2 should get White
    let (c1, c2) = allocate_colors(&p1, &p2);
    assert_eq!(c1, Color::Black);
    assert_eq!(c2, Color::White);
}

#[test]
fn test_generate_pairings_dummy_bye() {
    let players = vec![
        Player { id: 1, name: "A".into(), rating: 1500, score: 1.0, history: vec![], color_history: vec![], received_bye: false, is_dummy: false },
        Player { id: 2, name: "B".into(), rating: 1400, score: 1.0, history: vec![], color_history: vec![], received_bye: false, is_dummy: false },
        Player { id: 3, name: "C".into(), rating: 1300, score: 0.0, history: vec![], color_history: vec![], received_bye: false, is_dummy: false },
    ];

    let pairings = generate_pairings(players);
    // 3 players -> 4 total (1 dummy added) -> 2 matches
    assert_eq!(pairings.len(), 2);
    
    // We expect 1 and 2 to play each other (both score 1.0)
    // and 3 to play the dummy
    let mut all_players_seen = std::collections::HashSet::new();
    
    for (p1, p2) in pairings {
        all_players_seen.insert(p1);
        all_players_seen.insert(p2);
    }
    
    assert_eq!(all_players_seen.len(), 4, "Not all players (including dummy) were paired");
    assert!(all_players_seen.contains(&4), "Dummy player was not assigned");
}

