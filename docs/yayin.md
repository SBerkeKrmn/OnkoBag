# Yayın: Sunucuyu herkese açma ve test sürümü dağıtma

```
Telefon (APK / TestFlight) ──https──► Render: onkobag-api (Express + Socket.io)
                                              │
                                              └──► Render: onkobag-db (PostgreSQL 16)
```

## 1. Backend'i Render'a kurma (bir kez)

Gereken: GitHub deposu (`SBerkeKrmn/OnkoBag`) ve bir Render hesabı (https://render.com, GitHub ile giriş).

1. Render panelinde **New → Blueprint** → GitHub'ı bağlayın → `OnkoBag` deposunu seçin.
2. Render kökteki `render.yaml` dosyasını okur ve iki kaynak önerir: `onkobag-api` (web servisi) ve `onkobag-db` (PostgreSQL).
3. Gizli değerleri girin (yalnızca Render'da saklanır, depoya girmez):
   - `SMTP_USER` → gönderici Gmail adresi
   - `SMTP_PASS` → Gmail uygulama şifresi (bkz. [e-posta-kurulum.md](e-posta-kurulum.md))
   - `MAIL_FROM` → `OnkoBağ <gonderici@gmail.com>`
4. **Apply** deyin. İlk kurulum birkaç dakika sürer; açılışta migration'lar ve seed otomatik çalışır.
5. Servisin adresini kontrol edin (ör. `https://onkobag-api.onrender.com`):
   `https://<adres>/api/v1/health` → `{"status":"ok","database":"ok"}`

Adres `onkobag-api.onrender.com` değilse (isim alınmışsa Render sonuna ek koyar) `mobile/eas.json`
içindeki iki `EXPO_PUBLIC_API_URL` değerini gerçek adresle güncelleyin.

`main` dalına her push'ta Render backend'i yeniden kurar (`autoDeploy`).

### İlk yönetici hesabı (bulutta)

Uygulamadan kayıt olduktan sonra Render panelinde **onkobag-api → Shell**:
```
npm run user:set-role -- eposta@ornek.com ADMIN
```

### Ücretsiz plan notları

- Web servisi ~15 dakika istek almazsa uyur; ilk istekte uyanması ~1 dakika sürebilir.
- Ücretsiz PostgreSQL'in süre ve boyut sınırları vardır (Render panelinde görünür). Uzun süreli
  kullanım veya sunum günü için ücretli plana geçmek ya da veritabanını yedeklemek gerekebilir.
- Yerel geliştirme veritabanındaki veriler buluta taşınmaz; bulut boş başlar (kanser türleri ve odalar seed ile gelir).

## 2. Test kullanıcılarına uygulama dağıtma

Gereken: `npm install -g eas-cli` ve `eas login` (Expo hesabı).

### Android — APK bağlantısı (önerilen)
```
cd mobile
eas build --profile preview --platform android
```
Bitince EAS bir indirme bağlantısı ve QR kodu verir. Bu bağlantıyı test kullanıcılarıyla paylaşın;
telefonda "bilinmeyen kaynaklardan yükleme" izni verilerek kurulur. Bu sürüm bulut sunucusuna bağlanır ve
Google ile giriş de çalışır (Google Cloud'da Android istemci kimliği ve EAS imza sertifikasının SHA-1'i tanımlıysa:
`eas credentials` → Android → SHA-1).

### iPhone — TestFlight
Ücretli Apple Developer Program üyeliği gerekir.
```
eas build --profile production --platform ios
eas submit --platform ios
```
App Store Connect → TestFlight'tan test kullanıcılarını e-postayla veya herkese açık bağlantıyla davet edin
(harici test için Apple kısa bir inceleme yapar).

### Expo Go
Expo Go ile açmak yalnızca geliştirme sunucusu (bilgisayarınızda `npx expo start --tunnel`) çalışırken
mümkündür ve iPhone'da Expo Go yalnızca sizin Expo hesabınızla giriş yapılmış cihazlarda açar.
Bu yüzden başka ağlardaki test kullanıcıları için APK / TestFlight kullanılmalıdır. Expo Go ile bulut
sunucusuna bağlanmak için geliştirme sırasında `mobile/.env.local` dosyasına
`EXPO_PUBLIC_API_URL=https://<adres>/api/v1` yazmanız yeterlidir.
