# OnkoBağ — API Referansı

**Temel adres:** `http://<sunucu>:3000/api/v1`
**Kimlik doğrulama:** `Authorization: Bearer <accessToken>` (15 dk geçerli). Süresi dolunca `POST /auth/refresh` ile yenilenir.

## Genel Kurallar

**Başarılı yanıt**
```json
{ "data": { ... } }                          // tekil
{ "data": [ ... ], "nextCursor": "..." }     // sayfalı liste (son sayfada null)
```

**Hata yanıtı**
```json
{ "error": { "message": "Kullanıcıya gösterilebilir Türkçe mesaj", "code": "EMAIL_NOT_VERIFIED", "details": ... } }
```

| HTTP | Anlamı |
|---|---|
| 400 | Doğrulama hatası (`VALIDATION_ERROR`, `details` alan bazlı hataları içerir) veya iş kuralı ihlali |
| 401 | Token yok / geçersiz / süresi dolmuş (`TOKEN_INVALID`) → refresh denenmeli |
| 403 | Yetki yok; `EMAIL_NOT_VERIFIED`, `ACCOUNT_SUSPENDED`, `NOT_ROOM_MEMBER`, `SILENCED`, `DM_NOT_ALLOWED` … |
| 404 | Bulunamadı (engellenen kullanıcıların içerikleri de 404 döner) |
| 409 | Çakışma (`EMAIL_TAKEN`, `USERNAME_TAKEN`, `PROFILE_EXISTS`) |
| 429 | Çok fazla istek (auth uç noktalarında 15 dk'da 20 istek) |

**Sayfalama**
- Gönderi, yorum, bildirim: `?cursor=<son öğenin id'si>&limit=20`
- Mesajlar (oda/DM): `?before=<en eski mesaj id'si>&limit=30` — yanıt eskiden yeniye sıralıdır
- Takipçi, üye listeleri: `?offset=0&limit=30`

**Mesaj kimlikleri** BIGINT'tir ve JSON'da **string** olarak döner.

**E-posta doğrulaması** gerektiren işlemler: gönderi/yorum/mesaj oluşturma, medya yükleme, DM başlatma.

---

## Kimlik Doğrulama — `/auth`

| Metot | Yol | Gövde | Açıklama |
|---|---|---|---|
| POST | `/auth/register` | `email, password, username, displayName?, ageConfirmed: true, kvkkConsent: true, termsAccepted: true, cancerProfile: { cancerTypeId, status, diagnosisYear?, remissionYear? }` | Kayıt + otomatik oda ataması. Doğrulama kodu e-postayla gelir. `{ user, accessToken, refreshToken }` |
| POST | `/auth/login` | `email, password` | `{ user, accessToken, refreshToken }` |
| POST | `/auth/social` | `provider (GOOGLE\|APPLE), idToken, nonce? (Apple için zorunlu), fullName?` | Sağlayıcı token'ını doğrular. `status: AUTHENTICATED` → `{ user, accessToken, refreshToken }`; yeni kullanıcıysa `status: PROFILE_REQUIRED` → `{ signupToken, profile }` |
| POST | `/auth/social/complete` | `signupToken, username, displayName?, ageConfirmed, termsAccepted, kvkkConsent, cancerProfile` | Sosyal girişle gelen yeni kullanıcının kaydını tamamlar (30 dk geçerli token) |
| POST | `/auth/refresh` | `refreshToken` | Yeni token çifti (eski refresh token iptal olur) |
| POST | `/auth/logout` | `refreshToken` | Oturumu kapatır |
| POST | `/auth/verify-email` 🔒 | `code` (6 hane) | 5 hatalı denemede kod geçersizleşir |
| POST | `/auth/resend-verification` 🔒 | — | Yeni doğrulama kodu |
| POST | `/auth/forgot-password` | `email` | Hesap varsa sıfırlama kodu gönderir (her durumda 200) |
| POST | `/auth/reset-password` | `email, code, newPassword` | Tüm oturumları kapatır |
| POST | `/auth/change-password` 🔒 | `currentPassword, newPassword` | Diğer oturumları kapatır, yeni token döner |

Şifre kuralı: 8–72 karakter, en az bir harf ve bir rakam. Kullanıcı adı: 3–30 karakter, harf/rakam/`_`/`.`.

## Kullanıcılar — `/users` 🔒

| Metot | Yol | Açıklama |
|---|---|---|
| GET | `/users/me` | Kendi profilim (e-posta, kanser profilleri, istatistikler) |
| PATCH | `/users/me` | `displayName, bio, birthYear, gender, city, dmPermission, avatarMediaId` |
| DELETE | `/users/me` | `{ password }` — KVKK uyumlu hesap silme (anonimleştirme) |
| POST | `/users/me/cancer-profiles` | `{ cancerTypeId, status, diagnosisYear?, remissionYear?, isPrimary? }` — ilgili odaya da katılır |
| PATCH | `/users/me/cancer-profiles/:id` | Durum değişirse iyileşen doğrulaması sıfırlanır |
| DELETE | `/users/me/cancer-profiles/:id` | Son profil silinemez; odadan çıkar |
| GET | `/users/me/suggestions?status=SURVIVOR` | **Hasta–iyileşen eşleşmesi**: aynı kanser türündeki iyileşenler (doğrulanmışlar önce) |
| GET | `/users/me/blocks` | Engellediklerim |
| POST / DELETE | `/users/me/push-tokens` | `{ token, platform }` push bildirim cihazı |
| GET | `/users/search?q=` | Kullanıcı arama |
| GET | `/users/:id` · `/users/username/:username` | Profil + `relationship { isFollowing, followsMe, isBlocked, canMessage }` |
| GET | `/users/:id/followers` · `/users/:id/following` | Takip listeleri |
| POST / DELETE | `/users/:id/follow` | Takip et / bırak |
| POST / DELETE | `/users/:id/block` | Engelle / kaldır (takipler de silinir) |

## Kanser Türleri — `/cancer-types`

| Metot | Yol | Açıklama |
|---|---|---|
| GET | `/cancer-types` | Aktif türler (kimlik doğrulama gerekmez — kayıt ekranı için) |
| GET | `/cancer-types/:id` 🔒 | Topluluk özeti: aktif hasta / iyileşen / gönderi / oda sayıları |

## Genel Sohbet Odaları — `/rooms` 🔒

| Metot | Yol | Açıklama |
|---|---|---|
| GET | `/rooms/me` | Üye olduğum odalar (okunmamış sayısı, son mesaj) |
| GET | `/rooms/:id` | Oda detayı + hasta/iyileşen dağılımı |
| GET | `/rooms/:id/members` | Üyeler |
| GET | `/rooms/:id/messages?before=&limit=` | Mesaj geçmişi |
| POST | `/rooms/:id/messages` | `{ content?, replyToId?, mediaIds? }` (Socket.io yedeği) |
| PATCH / DELETE | `/rooms/:id/messages/:messageId` | Kendi mesajını düzenle / sil |
| POST | `/rooms/:id/read` | `{ messageId }` okundu işareti |
| POST | `/rooms/:id/mute` | `{ muted }` |

## Özel Mesajlar — `/conversations` 🔒

| Metot | Yol | Açıklama |
|---|---|---|
| GET | `/conversations` | Sohbetlerim (son mesaj, okunmamış, karşı tarafın okuduğu son mesaj) |
| POST | `/conversations` | `{ userId }` — sohbet başlat / mevcut olanı getir |
| GET | `/conversations/:id` | Sohbet detayı |
| DELETE | `/conversations/:id` | Yalnızca kendi listemden kaldır |
| GET | `/conversations/:id/messages?before=&limit=` | Mesaj geçmişi |
| POST | `/conversations/:id/messages` | `{ content?, mediaIds? }` (Socket.io yedeği) |
| DELETE | `/conversations/:id/messages/:messageId` | Kendi mesajını sil |
| POST | `/conversations/:id/read` · `/mute` | Okundu işareti / sessize alma |

## Gönderiler ve Yorumlar — `/posts`, `/comments` 🔒

| Metot | Yol | Açıklama |
|---|---|---|
| GET | `/posts?cancerTypeId=&category=&authorId=&cursor=` | Topluluk gönderileri |
| GET | `/posts/feed` | Kişisel akış (kendi toplulukları + takip edilenler) |
| POST | `/posts` | `{ cancerTypeId, category, title?, content, mediaIds? (≤4) }` |
| GET / PATCH / DELETE | `/posts/:id` | Detay / düzenle / sil |
| POST / DELETE | `/posts/:id/like` | Beğen / kaldır → `{ likeCount, likedByMe }` |
| GET | `/posts/:id/likes` | Beğenenler |
| GET | `/posts/:id/comments` | Yorumlar (yanıtlarıyla birlikte) |
| POST | `/posts/:id/comments` | `{ content, parentId? }` |
| PATCH / DELETE | `/comments/:id` | Düzenle / sil |
| POST / DELETE | `/comments/:id/like` | Yorum beğenme |

Kategoriler: `QUESTION`, `EXPERIENCE`, `TREATMENT`, `SIDE_EFFECTS`, `MOTIVATION`, `DAILY_LIFE`, `OTHER`.

## Medya — `/media` 🔒

| Metot | Yol | Açıklama |
|---|---|---|
| POST | `/media` | `multipart/form-data`, alan: `file` (JPEG/PNG/WEBP/HEIC, ≤5 MB) → `{ id, url }` |
| DELETE | `/media/:id` | Henüz kullanılmamış medyayı sil |

Akış: önce görseli yükle, dönen `id`'yi gönderi/mesaj oluştururken `mediaIds` içinde gönder.

## Bildirimler — `/notifications` 🔒

| Metot | Yol | Açıklama |
|---|---|---|
| GET | `/notifications?cursor=&unreadOnly=true` | Bildirimler |
| GET | `/notifications/unread-count` | Okunmamış sayısı |
| POST | `/notifications/:id/read` · `/notifications/read-all` | Okundu işaretleme |

Türler: `NEW_FOLLOWER`, `POST_LIKED`, `POST_COMMENTED`, `COMMENT_REPLIED`, `COMMENT_LIKED`, `SURVIVOR_VERIFIED`, `REPORT_RESOLVED`, `SYSTEM`.

## Şikayet — `/reports` 🔒

| Metot | Yol | Açıklama |
|---|---|---|
| POST | `/reports` | `{ targetType, targetId, reason, description? }` |
| GET | `/reports/me` | Şikayetlerim ve durumları |

Nedenler: `SPAM`, `HARASSMENT`, `MISINFORMATION`, `SELF_HARM`, `INAPPROPRIATE_CONTENT`, `IMPERSONATION`, `OTHER`.

## Moderasyon — `/admin` 🛡️ (MODERATOR, ADMIN)

| Metot | Yol | Açıklama |
|---|---|---|
| GET | `/admin/stats` | Panel özeti |
| GET / PATCH | `/admin/reports` · `/admin/reports/:id` | Şikayetler (hedef önizlemeli) / sonuçlandır |
| POST | `/admin/content/:targetType/:targetId/hide` · `/restore` | `{ reason, reportId? }` |
| GET | `/admin/users?q=&status=&role=` | Kullanıcılar (e-posta yalnızca ADMIN'e görünür) |
| POST | `/admin/users/:id/suspend` · `/unsuspend` · `/warn` | `{ until?, reason, reportId? }` |
| PATCH | `/admin/users/:id/role` | `{ role }` — **yalnızca ADMIN** |
| GET | `/admin/survivor-verifications` | Doğrulama bekleyen iyileşenler |
| POST | `/admin/cancer-profiles/:id/verify` · `/revoke` | İyileşen rozeti |
| GET / POST / PATCH | `/admin/rooms` · `/admin/rooms/:id` | Oda listesi / oluştur / güncelle-kapat |
| POST | `/admin/rooms/:roomId/members/:userId/silence` | `{ until, reason? }` odada susturma |
| POST / PATCH | `/admin/cancer-types` · `/admin/cancer-types/:id` | **yalnızca ADMIN** |
| GET | `/admin/logs?targetUserId=` | Denetim kayıtları |

İlk yönetici: `npm run user:set-role -- <e-posta> ADMIN`

---

## Socket.io (Gerçek Zamanlı)

**Bağlantı:** `io(SUNUCU_ADRESI, { auth: { token: accessToken } })` — bağlantı kurulunca sunucu `ready { rooms: [...] }` gönderir; kullanıcı üye olduğu tüm odalara otomatik katılmıştır.
Token süresi dolarsa bağlantı `connect_error` ile reddedilir → token yenilenip yeniden bağlanılır.

İstemciden gönderilen olaylar **ack** fonksiyonu alır: `socket.emit('room:send', payload, (res) => ...)` → `{ ok: true, data }` veya `{ ok: false, error: { message, code } }`.

| Yön | Olay | Veri |
|---|---|---|
| → | `room:send` | `{ roomId, content?, replyToId?, mediaIds? }` |
| → | `room:typing` | `{ roomId }` |
| → | `room:read` | `{ roomId, messageId }` |
| ← | `room:message:new` | Mesaj nesnesi |
| ← | `room:message:updated` | Düzenlenen / silinen / gizlenen mesaj |
| ← | `room:typing` | `{ roomId, user: { id, username } }` |
| → | `dm:send` | `{ conversationId, content?, mediaIds? }` |
| → | `dm:typing` | `{ conversationId }` |
| → | `dm:read` | `{ conversationId, messageId }` |
| ← | `dm:message:new` | Mesaj nesnesi (gönderenin diğer cihazlarına da gelir) |
| ← | `dm:message:updated` | Silinen / gizlenen mesaj |
| ← | `dm:typing` | `{ conversationId, userId }` |
| ← | `dm:read` | `{ conversationId, userId, messageId }` — "görüldü" |
| ← | `notification:new` | Bildirim nesnesi |
| ← | `moderation:urgent-report` | `{ reportId, reason }` — yalnızca moderatörlere |
