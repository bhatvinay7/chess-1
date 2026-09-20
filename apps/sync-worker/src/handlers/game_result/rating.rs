use uuid::Uuid;

#[derive(Debug, Clone, Copy)]
pub struct EloUpdate {
    pub white_rating_before: i32,
    pub black_rating_before: i32,
    pub white_rating_after: i32,
    pub black_rating_after: i32,
    pub white_delta: i32,
    pub black_delta: i32,
}

pub fn calculate_elo_update(white_rating: i32, black_rating: i32, white_score: f64) -> EloUpdate {
    let k_factor = 32.0;
    let expected_white = 1.0 / (1.0 + 10_f64.powf((black_rating - white_rating) as f64 / 400.0));
    let expected_black = 1.0 - expected_white;
    let black_score = 1.0 - white_score;

    let white_delta = (k_factor * (white_score - expected_white)).round() as i32;
    let black_delta = (k_factor * (black_score - expected_black)).round() as i32;

    EloUpdate {
        white_rating_before: white_rating,
        black_rating_before: black_rating,
        white_rating_after: (white_rating + white_delta).max(100),
        black_rating_after: (black_rating + black_delta).max(100),
        white_delta,
        black_delta,
    }
}

pub fn score_for_white(status: &str) -> f64 {
    match status {
        "WHITE_WIN" => 1.0,
        "BLACK_WIN" => 0.0,
        "DRAW" => 0.5,
        _ => 0.5,
    }
}

pub fn time_control_category(time_slot: &str) -> Option<&'static str> {
    let mut parts = time_slot.splitn(2, '+');
    let minutes: f64 = parts.next()?.trim().parse().ok()?;
    let increment: f64 = parts
        .next()
        .and_then(|s| s.trim().parse().ok())
        .unwrap_or(0.0);
    let estimated = minutes * 60.0 + increment * 40.0;
    Some(if estimated < 180.0 {
        "BULLET"
    } else if estimated < 600.0 {
        "BLITZ"
    } else {
        "RAPID"
    })
}

pub async fn upsert_user_rating(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    user_id: Uuid,
    category: &str,
    rating: i32,
    result: &str, // "WIN" | "LOSS" | "DRAW" | ""
) -> Result<(), Box<dyn std::error::Error>> {
    let (w, l, d): (i32, i32, i32) = match result {
        "WIN" => (1, 0, 0),
        "LOSS" => (0, 1, 0),
        "DRAW" => (0, 0, 1),
        _ => (0, 0, 0),
    };
    sqlx::query(
        r#"
        INSERT INTO "UserRating"
            (id, "userId", category, rating, wins, losses, draws, "createdAt", "updatedAt")
        VALUES
            (gen_random_uuid()::text, $1, $2::"RatingCategory", $3, $4, $5, $6, NOW(), NOW())
        ON CONFLICT ("userId", category) DO UPDATE
        SET rating     = EXCLUDED.rating,
            wins       = "UserRating".wins   + EXCLUDED.wins,
            losses     = "UserRating".losses + EXCLUDED.losses,
            draws      = "UserRating".draws  + EXCLUDED.draws,
            "updatedAt" = NOW()
        "#,
    )
    .bind(user_id)
    .bind(category)
    .bind(rating)
    .bind(w)
    .bind(l)
    .bind(d)
    .execute(&mut **tx)
    .await?;
    Ok(())
}

pub async fn set_user_rating(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    user_id: Uuid,
    rating: i32,
) -> Result<(), Box<dyn std::error::Error>> {
    sqlx::query(r#"UPDATE "User" SET rating = $1, "updatedAt" = NOW() WHERE id = $2"#)
        .bind(rating)
        .bind(user_id)
        .execute(&mut **tx)
        .await?;
    Ok(())
}

pub async fn increment_stat(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    user_id: Uuid,
    col: &str, // always one of "wins" | "losses" | "draws" — not user input
) -> Result<(), Box<dyn std::error::Error>> {
    let sql =
        format!(r#"UPDATE "User" SET "{col}" = "{col}" + 1, "updatedAt" = NOW() WHERE id = $1"#);
    sqlx::query(&sql).bind(user_id).execute(&mut **tx).await?;
    Ok(())
}
