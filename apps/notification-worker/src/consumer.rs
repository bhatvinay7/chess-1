use crate::config::AppState;
use crate::db::{
    get_time_control_display, get_tournament_data, get_user_data, save_notification_to_mongo,
};
use crate::email::send_email;
use rabbitmq_rustclient::types::MatchNotificationEvent;

pub async fn process_message(
    state: &AppState,
    data: &[u8],
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let event: MatchNotificationEvent = serde_json::from_slice(data)?;
    println!(
        "[notification-worker] Received MatchNotificationEvent for match {}",
        event.match_id
    );

    // Fetch User Data
    let white_user = get_user_data(&state.pg_pool, &event.white_player_id)
        .await?
        .unwrap_or_else(|| crate::db::UserData {
            email: None,
            username: "Unknown".to_string(),
        });
    let black_user = get_user_data(&state.pg_pool, &event.black_player_id)
        .await?
        .unwrap_or_else(|| crate::db::UserData {
            email: None,
            username: "Unknown".to_string(),
        });

    // Fetch Tournament Data
    let t_data = get_tournament_data(&state.pg_pool, &event.tournament_id).await?;
    let (game_type, time_control) = if let Some(t) = t_data {
        let tc_display = if let Some(tc_id) = t.time_control_id {
            get_time_control_display(&state.pg_pool, &tc_id)
                .await
                .unwrap_or_else(|_| "Unknown".to_string())
        } else {
            "Custom".to_string()
        };
        (t.game_type, tc_display)
    } else {
        ("Unknown".to_string(), "Unknown".to_string())
    };

    let tournament_link = format!("/tournament/{}", event.tournament_id);

    let players = vec![
        (
            &event.white_player_id,
            &white_user.username,
            &white_user.email,
            &black_user.username,
        ),
        (
            &event.black_player_id,
            &black_user.username,
            &black_user.email,
            &white_user.username,
        ),
    ];

    for (player_id, player_name, player_email_opt, opponent_name) in players {
        let message_text = format!(
            "Your {} tournament match (game mode: {}, time control: {}) is starting soon!",
            game_type, game_type, time_control
        );

        save_notification_to_mongo(
            &state.mongo_client,
            player_id,
            "TOURNAMENT_MATCH_STARTED",
            &message_text,
            &event,
        )
        .await?;

        if let Some(user_email) = player_email_opt {
            send_email(
                &state.mailer,
                user_email,
                player_name,
                opponent_name,
                &tournament_link,
                &game_type,
                &time_control,
            )?;
        } else {
            println!(
                "[notification-worker] No email found for user {} ({})",
                player_name, player_id
            );
        }
    }

    Ok(())
}
