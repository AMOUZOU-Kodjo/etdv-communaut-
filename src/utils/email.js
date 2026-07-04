const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendEmail = async ({ to, subject, html }) => {
  if (process.env.NODE_ENV === "development") {
    console.log(`[EMAIL] To: ${to} | Subject: ${subject}`);
    return;
  }
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || "ETDV-Communaute <noreply@etdv-communaute.com>",
    to,
    subject,
    html,
  });
};

const sendMorningPrayerNotification = async (user, prayer, authorName) => {
  const siteUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const link = `${siteUrl}/prieres-matinales/${prayer.id}`;

  const subject = `✨ Priere matinale par ${authorName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto; padding:20px;">
      <h2 style="color:#4a5568;">${prayer.title}</h2>
      <p style="font-size:16px; color:#333;">${prayer.content}</p>
      ${prayer.bibleVerse ? `<blockquote style="border-left:4px solid #3182ce; padding-left:16px; font-style:italic; color:#555;">${prayer.bibleVerse}</blockquote>` : ""}
      <p style="color:#718096;">— ${authorName}</p>
      <a href="${link}" style="display:inline-block; padding:12px 24px; background:#3182ce; color:white; text-decoration:none; border-radius:6px; margin-top:16px;">
        Voir la priere
      </a>
    </div>
  `;

  await sendEmail({ to: user.email, subject, html });
};

const sendOtpEmail = async (email, code) => {
  const subject = "Votre code de connexion ETDV-Communaute";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width:400px; margin:auto; padding:20px; text-align:center;">
      <h2 style="color:#4a5568;">ETDV-Communaute</h2>
      <p style="font-size:16px; color:#333;">Voici votre code de verification :</p>
      <div style="font-size:36px; font-weight:bold; letter-spacing:8px; color:#3182ce; padding:16px; background:#ebf8ff; border-radius:8px; margin:16px 0;">
        ${code}
      </div>
      <p style="color:#718096;">Ce code expire dans 5 minutes.</p>
    </div>
  `;
  await sendEmail({ to: email, subject, html });
};

module.exports = { sendEmail, sendMorningPrayerNotification, sendOtpEmail };
