import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST!,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE! === "true",
  auth: {
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!,
  },
});

export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  await transporter.sendMail({
    from: process.env.SMTP_FROM! || '"Rooky" <noreply@rooky.com>',
    to,
    subject: "Your Rooky sign-in code",
    text: `Your OTP is: ${otp}\n\nThis code expires in 10 minutes. Do not share it.`,
    html: buildOtpHtml(otp, "sign in"),
  });
}

export async function sendPasswordResetEmail(to: string, otp: string): Promise<void> {
  await transporter.sendMail({
    from: process.env.SMTP_FROM! || '"Rooky" <noreply@rooky.com>',
    to,
    subject: "Reset your Rooky password",
    text: `Your password reset code is: ${otp}\n\nThis code expires in 10 minutes. Do not share it.`,
    html: buildOtpHtml(otp, "reset your password"),
  });
}

function buildOtpHtml(otp: string, action: string): string {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#0f172a;color:#f8fafc;border-radius:12px;">
      <h2 style="margin:0 0 8px;color:#81b64c;">♟ Rooky</h2>
      <p style="margin:0 0 24px;color:#94a3b8;">Use the code below to ${action}. It expires in <strong>10 minutes</strong>.</p>
      <div style="font-size:2.5rem;font-weight:800;letter-spacing:0.5rem;color:#81b64c;text-align:center;padding:24px;background:#1e293b;border-radius:8px;margin-bottom:24px;">
        ${otp}
      </div>
      <p style="margin:0;color:#64748b;font-size:0.85rem;">If you didn't request this, you can safely ignore it.</p>
    </div>
  `;
}
