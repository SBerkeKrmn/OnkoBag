// E-posta gönderimi. SMTP yapılandırılmamışsa e-postalar konsola yazılır;
// test ortamında bellekteki `outbox` dizisine eklenir (testler kodları buradan okur).
const nodemailer = require('nodemailer');
const env = require('../config/env');

const outbox = [];

const transporter = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    })
  : null;

async function sendMail({ to, subject, text }) {
  if (env.isTest) {
    outbox.push({ to, subject, text });
    return;
  }

  if (!transporter) {
    console.log(
      `\n[E-POSTA — SMTP ayarlı olmadığı için gönderilmedi, yalnızca burada görünür]\nAlıcı: ${to}\nKonu: ${subject}\n${text}\n`,
    );
    return;
  }

  await transporter.sendMail({ from: env.MAIL_FROM, to, subject, text });
}

/** Gönderim hatası ana işlemi (kayıt vb.) bozmasın diye hatayı yutup loglar */
async function sendMailSafe(mail) {
  try {
    await sendMail(mail);
  } catch (err) {
    console.error('E-posta gönderilemedi:', err.message);
  }
}

const sendVerificationCode = (to, code) =>
  sendMailSafe({
    to,
    subject: 'OnkoBağ e-posta doğrulama kodunuz',
    text: `Merhaba,\n\nOnkoBağ hesabınızı doğrulamak için kodunuz: ${code}\n\nKod 15 dakika geçerlidir. Bu isteği siz yapmadıysanız bu e-postayı dikkate almayın.`,
  });

const sendPasswordResetCode = (to, code) =>
  sendMailSafe({
    to,
    subject: 'OnkoBağ şifre sıfırlama kodunuz',
    text: `Merhaba,\n\nŞifrenizi sıfırlamak için kodunuz: ${code}\n\nKod 15 dakika geçerlidir. Bu isteği siz yapmadıysanız hesabınız güvende; bu e-postayı dikkate almayın.`,
  });

module.exports = { outbox, sendVerificationCode, sendPasswordResetCode };
