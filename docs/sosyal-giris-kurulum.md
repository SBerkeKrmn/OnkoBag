# Google ve Apple ile Giriş — Kurulum

Kod tarafı hazırdır. Sağlayıcıların çalışması için aşağıdaki hesap ve kimlik bilgileri gereklidir.

## Nasıl çalışır

```
Mobil uygulama ──(Google/Apple oturumu)──► Sağlayıcı ──► ID token (JWT)
Mobil uygulama ──POST /auth/social { idToken }──► Backend
Backend: token imzasını sağlayıcının açık anahtarlarıyla doğrular (iss, aud, süre, Apple'da nonce)
  ├─ Hesap daha önce bağlanmış          → oturum açılır
  ├─ Doğrulanmış e-posta mevcut hesabın  → hesaba bağlanır, oturum açılır
  └─ Yeni kullanıcı                      → PROFILE_REQUIRED: kullanıcı adı, kanser profili,
                                           18 yaş / şartlar / KVKK onayı alınır → /auth/social/complete
```

- Şifre hiçbir zaman uygulamaya veya backend'e gelmez; yalnızca sağlayıcının imzaladığı kimlik token'ı doğrulanır.
- Doğrulanmamış e-posta ile mevcut hesaba bağlanma yapılmaz (hesap ele geçirmeye karşı).
- Sosyal girişli kullanıcılar da KVKK açık rızası ve 18 yaş onayı vermeden hesap oluşturamaz.
- App Store kuralı 4.8 gereği Google ile giriş sunulduğu için Apple ile giriş de aynı belirginlikte sunulur.

## Apple ile giriş

| Ortam | Durum |
|---|---|
| Expo Go (iOS) | **Hemen test edilebilir.** Token'ın `aud` değeri `host.exp.Exponent` olur; backend'de varsayılan olarak kabul edilir. |
| Android / web | Apple düğmesi gösterilmez. |
| Mağaza sürümü (iOS) | Apple Developer Program üyeliği (yıllık ücretli) ve `com.onkobag.app` için "Sign In with Apple" yeteneği gerekir. `app.json` içinde `ios.usesAppleSignIn: true` ayarlıdır. |

Üretimde `backend/.env` içindeki `APPLE_AUDIENCES` değerinden `host.exp.Exponent` kaldırılmalıdır.

## Google ile giriş

Google girişi yerel modül kullandığı için **Expo Go'da çalışmaz**; development build gerekir (`npx expo run:android` / `npx expo run:ios` veya EAS Build).

1. [Google Cloud Console](https://console.cloud.google.com/) → yeni proje → **APIs & Services → OAuth consent screen**: uygulama adı, destek e-postası, gizlilik politikası bağlantısı.
2. **Credentials → Create credentials → OAuth client ID** ile üç istemci oluşturun:
   - **Web application** → backend doğrulaması ve Android için `webClientId`
   - **iOS** → Bundle ID: `com.onkobag.app`
   - **Android** → Paket adı: `com.onkobag.app` + imzalama sertifikasının SHA-1 parmak izi
3. `mobile/app.json`:
   ```json
   "extra": {
     "googleWebClientId": "<WEB_CLIENT_ID>.apps.googleusercontent.com",
     "googleIosClientId": "<IOS_CLIENT_ID>.apps.googleusercontent.com"
   }
   ```
   ve `plugins` dizisine (iOS istemci kimliğinin ters çevrilmiş hali):
   ```json
   ["@react-native-google-signin/google-signin", { "iosUrlScheme": "com.googleusercontent.apps.<IOS_CLIENT_ID>" }]
   ```
4. `backend/.env`:
   ```
   GOOGLE_CLIENT_IDS=<WEB_CLIENT_ID>.apps.googleusercontent.com,<IOS_CLIENT_ID>.apps.googleusercontent.com
   ```
5. Development build alın ve test edin.

## Hesap yönetimi

- Yalnızca Google/Apple ile kayıt olan kullanıcının şifresi yoktur; Ayarlar → **Şifre belirle** ile e-posta kodu üzerinden şifre oluşturabilir.
- Bu kullanıcılar hesaplarını şifre yerine açık onayla siler; silme işleminde sağlayıcı bağlantısı da kaldırılır.
