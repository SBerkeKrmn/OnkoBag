# E-posta (SMTP) Kurulumu

Doğrulama ve şifre sıfırlama kodları e-postayla gönderilir. `backend/.env` içinde SMTP ayarlı
değilse e-posta **gönderilmez**; kod yalnızca backend konsoluna yazılır (geliştirme kolaylığı).

## Gmail ile (geliştirme ve demo için)

1. Gönderici olarak kullanılacak Gmail hesabında **2 adımlı doğrulamayı** açın:
   Google Hesabı → Güvenlik → 2 Adımlı Doğrulama.
2. **Uygulama şifresi** oluşturun: Google Hesabı → Güvenlik → Uygulama şifreleri
   (https://myaccount.google.com/apppasswords) → ad olarak "OnkoBağ" yazın → 16 haneli şifreyi kopyalayın.
3. `backend/.env` dosyasını doldurun (bu dosya git'e eklenmez):
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=gonderici@gmail.com
   SMTP_PASS=abcdefghijklmnop        # uygulama şifresi, boşluksuz
   MAIL_FROM="OnkoBağ <gonderici@gmail.com>"
   ```
   Gmail, gönderen adresini `SMTP_USER` ile aynı olacak şekilde değiştirir; `MAIL_FROM` içinde aynı adresi kullanın.
4. Ayarı deneyin:
   ```
   cd backend
   npm run mail:test -- alici@eposta.com
   ```
5. Backend'i yeniden başlatın (`npm run dev` `.env` değişikliğini kendiliğinden almaz).

Gmail günlük ~500 e-posta sınırı vardır; bitirme projesi ve demo için yeterlidir.

## Yayın (üretim) için

Gmail yerine işlemsel e-posta servisi önerilir (ör. Brevo, Mailgun, Amazon SES, Resend). Bu servisler
kendi alan adınızla (`no-reply@onkobag.com`) gönderim, SPF/DKIM ve teslim raporu sağlar.
Hepsi SMTP sunduğu için yalnızca `.env` değerleri değişir; kod değişikliği gerekmez.
