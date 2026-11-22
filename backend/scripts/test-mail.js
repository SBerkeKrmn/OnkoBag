// SMTP ayarlarını dener ve verilen adrese deneme e-postası gönderir.
// Kullanım: npm run mail:test -- alici@eposta.com
const nodemailer = require('nodemailer');
const env = require('../src/config/env');

async function main() {
  const to = process.argv[2];
  if (!to) {
    console.error('Kullanım: npm run mail:test -- alici@eposta.com');
    process.exit(1);
  }
  if (!env.SMTP_HOST) {
    console.error('SMTP_HOST boş. backend/.env içindeki SMTP_* değerlerini doldurun (bkz. docs/e-posta-kurulum.md).');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });

  try {
    await transporter.verify();
    console.log(`SMTP bağlantısı başarılı (${env.SMTP_HOST}:${env.SMTP_PORT}).`);
    await transporter.sendMail({
      from: env.MAIL_FROM,
      to,
      subject: 'OnkoBağ deneme e-postası',
      text: 'Bu e-postayı aldıysanız OnkoBağ e-posta ayarları doğru çalışıyor.',
    });
    console.log(`Deneme e-postası gönderildi: ${to}`);
  } catch (err) {
    console.error('E-posta gönderilemedi:', err.message);
    if (/Invalid login|Username and Password not accepted|535/i.test(err.message)) {
      console.error('İpucu: Gmail için normal şifre değil, 16 haneli "Uygulama şifresi" kullanılmalı.');
    }
    process.exit(1);
  }
}

main();
