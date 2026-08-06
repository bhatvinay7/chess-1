use lettre::{Message, SmtpTransport, Transport};

pub fn send_email(
    mailer: &SmtpTransport,
    to_email: &str,
    to_name: &str,
    opponent_name: &str,
    tournament_link: &str,
    format: &str,
    time_control: &str,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let body = format!(
        "Hi {},\n\nYour tournament match against {} is starting soon.\n\nDetails:\nFormat: {}\nTime Control: {}\nLink: {}\n\nGood luck!\n\nChess Platform",
        to_name,
        opponent_name,
        format,
        time_control,
        tournament_link
    );

    let email = Message::builder()
        .from("noreply@chessplatform.com".parse()?)
        .to(format!("{} <{}>", to_name, to_email).parse()?)
        .subject("Your Tournament Match is Starting!")
        .body(body)?;

    mailer.send(&email)?;
    println!(
        "[notification-worker] Sent email to {} ({})",
        to_name, to_email
    );

    Ok(())
}
