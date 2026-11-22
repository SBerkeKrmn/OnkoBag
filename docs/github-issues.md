# OnkoBağ — İş Paketleri ve GitHub Issues Listesi

Bu dosya, GitHub Issues üzerinde takip edilecek iş paketlerinin listesidir. Her başlık bir Issue'dur.
Tamamlanan işler kapatılırken ilgili commit kimliği yorum olarak eklenir; böylece Issue ile kod değişikliği birbirine bağlanır.

## Etiketler (Labels)

| Etiket | Renk | Kullanım |
|---|---|---|
| `veritabanı` | `#5319e7` | Şema, migration, seed |
| `backend` | `#1d76db` | Node.js / Express / Socket.io |
| `mobil` | `#0e8a16` | React Native (Expo) |
| `güvenlik` | `#b60205` | Kimlik doğrulama, yetkilendirme, KVKK |
| `test` | `#fbca04` | Otomatik testler, test planı |
| `dokümantasyon` | `#c5def5` | README, API, tasarım dokümanları |
| `teslim` | `#d93f0b` | Dersin teslim gereksinimleri (rapor, web sitesi …) |

## Kilometre Taşları (Milestones)

| Milestone | Bitiş tarihi | Kapsam |
|---|---|---|
| **Vize Teslimi** | 15 Aralık 2026 | Tasarım raporu, aylık raporlar, depo, web sitesi, çalışan backend |
| **Final Raporu** | 10 Ocak 2027 | Defter formatında final raporu, mobil uygulamanın temel ekranları |
| **BIL402 — Bitirme II** | Dönem sonu | Mobil uygulamanın tamamlanması, dağıtım, kullanıcı testleri |

---

## ✅ Tamamlanan İşler (açıp hemen kapatılacak)

### #1 Veritabanı şemasının tasarlanması
- **Etiketler:** `veritabanı`
- **Milestone:** Vize Teslimi
- **Commit:** `3dec960`

```
Kullanıcı, kanser türü, hastalık profili, sohbet odası, özel mesaj, gönderi,
yorum, beğeni, medya, takip, engelleme, şikayet, moderasyon ve bildirim
tablolarından oluşan PostgreSQL veri modeli Prisma ile tasarlandı.

- [x] 22 tabloluk Prisma şeması
- [x] Prisma'nın desteklemediği CHECK ve kısmi unique kısıtları
- [x] Kanser türleri ve varsayılan odalar için seed
- [x] ER diyagramı ve veri modeli dokümanı (docs/veritabani.md)
```

### #2 Backend proje iskeleti ve ilk migration
- **Etiketler:** `backend`, `veritabanı`
- **Milestone:** Vize Teslimi
- **Commit:** `ffe9557`

```
- [x] docker-compose ile yerel PostgreSQL 16
- [x] Express + Socket.io sunucu iskeleti (helmet, cors, rate limit, hata yönetimi)
- [x] Ortam değişkeni doğrulaması (zod)
- [x] İlk migration ve seed'in uygulanması
- [x] /health ve /cancer-types uç noktaları
```

### #3 Mobil uygulama iskeleti (Expo + Expo Router)
- **Etiketler:** `mobil`
- **Milestone:** Vize Teslimi
- **Commit:** `1c4c159`

```
- [x] Expo SDK 58 projesi, Expo Router ile dosya tabanlı navigasyon
- [x] src/ klasör yapısı (app, api, constants)
- [x] Backend bağlantısını test eden karşılama ekranı
```

### #4 Kimlik doğrulama modülü
- **Etiketler:** `backend`, `güvenlik`
- **Milestone:** Vize Teslimi
- **Commit:** `f620135`

```
- [x] Kayıt (KVKK açık rıza, ilk kanser profili, otomatik oda ataması)
- [x] Giriş, refresh token rotasyonu ve tekrar kullanım tespiti, çıkış
- [x] 6 haneli e-posta doğrulama ve şifre sıfırlama kodları (5 deneme sınırı)
- [x] Şifre değiştirme, auth uç noktalarında rate limit
```

### #5 Kullanıcı profili, takip, engelleme ve hasta–iyileşen eşleşmesi
- **Etiketler:** `backend`
- **Milestone:** Vize Teslimi
- **Commit:** `f620135`

```
- [x] Profil görüntüleme/güncelleme, KVKK uyumlu hesap silme
- [x] Çoklu kanser profili ve oda üyeliği senkronizasyonu
- [x] Aynı kanser türündeki iyileşenleri öneren eşleşme uç noktası
- [x] Takip, iki yönlü engelleme, kullanıcı arama
```

### #6 Genel sohbet odaları ve Socket.io
- **Etiketler:** `backend`
- **Milestone:** Vize Teslimi
- **Commit:** `798f58a`

```
- [x] Kapasite dolunca aynı türde yeni oda açan ölçeklenebilir oda ataması
- [x] Eşzamanlı kayıtlarda yarış durumuna karşı advisory lock
- [x] Mesaj geçmişi, gönderme, yanıtlama, düzenleme, silme, okundu bilgisi
- [x] Socket.io olayları (room:send, room:typing, room:read)
```

### #7 Medya (görsel) yükleme
- **Etiketler:** `backend`, `güvenlik`
- **Milestone:** Vize Teslimi
- **Commit:** `798f58a`

```
- [x] JPEG/PNG/WEBP/HEIC, 5 MB sınırı
- [x] Dosya imzası (magic bytes) kontrolü
- [x] Gönderi/mesaja tek seferlik bağlama
```

### #8 Birebir özel mesajlaşma
- **Etiketler:** `backend`
- **Milestone:** Vize Teslimi
- **Commit:** `6ace775`

```
- [x] İki kullanıcı arasında tek sohbet
- [x] DM izni (herkes / takip ettiklerim / kimse) ve engelleme kontrolü
- [x] Okunmamış sayısı, "yazıyor" ve "görüldü" bilgisi
- [x] Socket.io olayları (dm:send, dm:typing, dm:read)
```

### #9 Gönderi, yorum ve beğeni
- **Etiketler:** `backend`
- **Milestone:** Vize Teslimi
- **Commit:** `14f7e0a`

```
- [x] Kategorili gönderiler (en fazla 4 görsel), topluluk listesi ve kişisel akış
- [x] Tek seviye yanıtlı yorumlar, gönderi ve yorum beğenileri
- [x] Beğeni/yorum bildirimleri
```

### #10 Bildirim, şikayet ve moderasyon paneli
- **Etiketler:** `backend`, `güvenlik`
- **Milestone:** Vize Teslimi
- **Commit:** `9836214`

```
- [x] Bildirim listesi, okunmamış sayısı, anlık bildirim
- [x] Şikayet (yanlış tıbbi bilgi, kendine zarar riski vb.); acil şikayetler moderatörlere anlık
- [x] İçerik gizleme, uyarı, askıya alma, odada susturma, rol yönetimi
- [x] İyileşen rozeti doğrulama
- [x] Moderasyon denetim kaydı
```

### #11 Backend entegrasyon testleri
- **Etiketler:** `test`
- **Milestone:** Vize Teslimi
- **Commit:** `f620135`, `798f58a`, `6ace775`, `14f7e0a`, `9836214`

```
- [x] Ayrı test veritabanı ve hazırlama script'i
- [x] node:test + supertest + socket.io-client ile 61 entegrasyon testi
```

### #12 API dokümantasyonu
- **Etiketler:** `dokümantasyon`
- **Milestone:** Vize Teslimi
- **Commit:** `9abf73d`

```
- [x] Tüm REST uç noktaları, hata kodları, sayfalama kuralları (docs/api.md)
- [x] Socket.io olay referansı
```

---

## 📋 Yapılacak İşler (açık kalacak)

### #13 Danışman görüşmesi ve konu onayı ✅
- **Etiketler:** `teslim`
- **Milestone:** Vize Teslimi
- **Durum:** Tamamlandı (kod değişikliği içermez; görüşme bilgisi Issue yorumunda)

```
- [x] WhatsApp üzerinden özel mesajla randevu talebi
- [x] Bir sayfalık konu önerisiyle görüşmeye katılım
- [x] Onaylanan konu adının not edilmesi (rapor kapağında aynen kullanılacak)
```

### #14 Öneri ve tasarım raporu (8–15 sayfa)
- **Etiketler:** `teslim`, `dokümantasyon`
- **Milestone:** Vize Teslimi

```
- [ ] Kapak, problem tanımı ve motivasyon
- [ ] Literatür: en az 10 kaynak, en az 3 benzer sistemle karşılaştırma tablosu
- [ ] İşlevsel ve işlevsel olmayan gereksinimler
- [ ] Mimari şema, veri modeli, teknoloji seçim gerekçeleri, özgün yönler
- [ ] Proje planı: iş paketleri, zaman çizelgesi, risk tablosu, test/kalite planı
- [ ] Bu dönem öğrenilen teknolojiler ve denemeler
- [ ] Kaynakça
```

### #15 Aylık raporlar (Ekim, Kasım, Aralık 2026)
- **Etiketler:** `teslim`
- **Milestone:** Vize Teslimi

```
- [ ] Ekim 2026 raporu
- [ ] Kasım 2026 raporu
- [ ] Aralık 2026 raporu
Her rapor: yapılanlar, harcanan süre, plana göre durum, sorunlar, öğrenilenler, gelecek ay planı.
```

### #16 Proje web sitesi (GitHub Pages)
- **Etiketler:** `teslim`, `dokümantasyon`
- **Milestone:** Vize Teslimi

```
- [ ] Proje adı, çözülen problem, çözüm yaklaşımı
- [ ] Mimari şema, zaman planı ve güncel durum
- [ ] Ekip ve depo bağlantısı
- [ ] Gerçek kişilere ait veri içermemeli
- [ ] README'ye site bağlantısının eklenmesi
```

### #17 Kaynak kodun zip olarak TRACDEX'e yüklenmesi
- **Etiketler:** `teslim`
- **Milestone:** Vize Teslimi

```
- [ ] node_modules ve uploads hariç, en fazla 20 MB
- [ ] Rapor, aylık raporlar, depo ve web sitesi bağlantılarının yüklenmesi
```

### #18 Mobil: API istemcisi, oturum yönetimi ve Socket.io bağlantısı
- **Etiketler:** `mobil`, `güvenlik`
- **Milestone:** Final Raporu

```
- [ ] Token'ların expo-secure-store'da saklanması
- [ ] 401 alındığında otomatik token yenileme
- [ ] Oturum durumuna göre yönlendirme (giriş / ana ekran)
- [ ] Socket.io bağlantısı ve yeniden bağlanma
```

### #19 Mobil: Kayıt, giriş, e-posta doğrulama ve şifre sıfırlama ekranları
- **Etiketler:** `mobil`
- **Milestone:** Final Raporu

```
- [ ] Kayıt sihirbazı: hesap bilgileri → kanser türü ve durum seçimi → KVKK onayı
- [ ] Giriş ekranı
- [ ] 6 haneli kod ile e-posta doğrulama
- [ ] Şifremi unuttum akışı
```

### #20 Mobil: Genel sohbet odası ekranları
- **Etiketler:** `mobil`
- **Milestone:** Final Raporu

```
- [ ] Odalarım listesi (okunmamış sayısı)
- [ ] Sohbet ekranı: anlık mesaj, yanıtlama, "yazıyor" göstergesi, eski mesajları yükleme
- [ ] Mesaj gönderenin rozeti (aktif hasta / iyileşen / doğrulanmış iyileşen)
```

### #21 Mobil: Birebir mesajlaşma ekranları
- **Etiketler:** `mobil`
- **Milestone:** BIL402 — Bitirme II

```
- [ ] Sohbet listesi
- [ ] Sohbet ekranı ("görüldü" ve "yazıyor" bilgisi, görsel gönderme)
- [ ] Profil ve oda ekranından sohbet başlatma
```

### #22 Mobil: Akış, gönderi ve yorum ekranları
- **Etiketler:** `mobil`
- **Milestone:** BIL402 — Bitirme II

```
- [ ] Kişisel akış ve topluluk sekmeleri, kategori filtresi
- [ ] Gönderi oluşturma (görsel ekleme)
- [ ] Gönderi detayı, yorumlar ve yanıtlar, beğeni
```

### #23 Mobil: Profil, takip, engelleme ve iyileşen önerileri
- **Etiketler:** `mobil`
- **Milestone:** BIL402 — Bitirme II

```
- [ ] Kendi profilim ve düzenleme (avatar, kanser profilleri, DM izni)
- [ ] Başka kullanıcının profili, takip et / engelle / şikayet et
- [ ] "Seninle aynı yoldan geçenler" iyileşen önerileri ekranı
```

### #24 Mobil: Bildirimler ve push bildirimleri
- **Etiketler:** `mobil`, `backend`
- **Milestone:** BIL402 — Bitirme II

```
- [ ] Bildirim listesi ve okunmamış rozeti
- [ ] Expo push token alma ve backend'e kaydetme
- [ ] Backend: yeni mesaj ve bildirimlerde Expo Push API ile gönderim
```

### #25 Mobil: Moderatör ekranları
- **Etiketler:** `mobil`
- **Milestone:** BIL402 — Bitirme II

```
- [ ] Şikayet listesi ve içerik gizleme
- [ ] İyileşen doğrulama listesi
- [ ] Kullanıcı uyarma / askıya alma
```

### #26 Backend: Gerçek e-posta gönderimi (SMTP)
- **Etiketler:** `backend`
- **Milestone:** BIL402 — Bitirme II

```
- [ ] Bir SMTP sağlayıcısının yapılandırılması
- [ ] Doğrulama ve şifre sıfırlama e-postalarının uçtan uca denenmesi
```

### #27 Backend: Kullanılmayan medyanın periyodik temizliği
- **Etiketler:** `backend`
- **Milestone:** BIL402 — Bitirme II

```
- [ ] 24 saatten eski ve hiçbir içeriğe bağlanmamış (avatar olmayan) görsellerin silinmesi
```

### #28 Dağıtım: Backend'in sunucuya kurulumu (HTTPS / WSS)
- **Etiketler:** `backend`, `güvenlik`
- **Milestone:** BIL402 — Bitirme II

```
- [ ] Barındırma platformu seçimi
- [ ] Yönetilen PostgreSQL, ortam değişkenleri, migration'ların uygulanması
- [ ] HTTPS ve WSS üzerinden erişim
- [ ] Mobil uygulamanın üretim API adresine bağlanması
```

### #29 Test ve kalite: Mobil testler ve kullanıcı testleri
- **Etiketler:** `test`
- **Milestone:** BIL402 — Bitirme II

```
- [ ] Kritik mobil akışların testleri (kayıt, mesajlaşma)
- [ ] Gönüllü kullanıcılarla kullanılabilirlik testi ve geri bildirim
- [ ] Bulunan hataların düzeltilmesi
```
