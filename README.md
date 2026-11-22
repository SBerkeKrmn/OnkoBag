# OnkoBağ

Aktif tedavi sürecindeki kanser hastalarını, aynı kanser türünü atlatmış bireylerle (iyileşenler) güvenli bir mobil ortamda buluşturan psikososyal akran desteği uygulaması.

> BIL401 Bitirme Çalışması I — Şerif Berke Karaman

## Özellikler

- Kanser türü ve duruma (aktif hasta / iyileşen) göre kayıt ve profil
- Her kanser türü için canlı genel sohbet odaları (yoğunluğa göre ölçeklenen)
- Gönderi, yorum, beğeni ve takip
- Birebir özel mesajlaşma
- Şikayet, engelleme ve moderasyon

## Teknolojiler

| Katman | Teknoloji |
|---|---|
| Mobil | React Native |
| Backend | Node.js, Express.js |
| Gerçek zamanlı iletişim | Socket.io |
| Veritabanı | PostgreSQL, Prisma ORM |
| Güvenlik | JWT, HTTPS/WSS, bcrypt |

## Proje Yapısı

```
OnkoBag/
├── docker-compose.yml        # Yerel PostgreSQL 16
├── backend/                  # Node.js + Express API ve Socket.io sunucusu
│   ├── prisma/
│   │   ├── schema.prisma     # Veri modeli
│   │   ├── migrations/       # Veritabanı migration'ları
│   │   ├── sql/              # Prisma dışı ek kısıtlar (CHECK, kısmi indeks)
│   │   └── seed.js           # Kanser türleri + varsayılan sohbet odaları
│   └── src/
│   ├── src/
│   │   ├── config/           # Ortam değişkenleri (zod ile doğrulanır)
│   │   ├── lib/              # Prisma, e-posta, realtime, engelleme yardımcıları
│   │   ├── middlewares/      # JWT doğrulama, rol kontrolü, hata yönetimi
│   │   ├── modules/          # auth, users, rooms, conversations, posts, media,
│   │   │                     # notifications, reports, admin, cancer-types
│   │   │                     # (her biri: *.routes.js, *.service.js, *.schemas.js)
│   │   ├── routes/           # /api/v1 router'ı
│   │   ├── sockets/          # Socket.io sunucusu ve olay işleyicileri
│   │   ├── utils/            # Doğrulama, sayfalama, token yardımcıları
│   │   ├── app.js            # Express uygulaması
│   │   └── server.js         # Giriş noktası (HTTP + Socket.io)
│   ├── scripts/              # Test veritabanı hazırlama, rol atama
│   └── tests/                # Entegrasyon testleri (node:test + supertest)
├── mobile/                   # React Native (Expo) uygulaması
│   └── src/
│       ├── app/              # Ekranlar (Expo Router, dosya tabanlı)
│       ├── api/              # Backend istemcisi
│       └── constants/        # Tema ve yapılandırma
└── docs/                     # Tasarım dokümanları
```

## Kurulum

Gereksinimler: Node.js 20+, Docker Desktop, telefonda [Expo Go](https://expo.dev/go) (veya Android emülatörü).

```bash
# 1. Veritabanını başlat
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env          # JWT_ACCESS_SECRET değerini değiştirin
npm install
npx prisma migrate deploy     # tabloları oluştur
npx prisma db seed            # kanser türleri ve odalar
npm run dev                   # http://localhost:3000/api/v1/health

# İlk yönetici hesabı (uygulamadan kayıt olduktan sonra)
npm run user:set-role -- ornek@eposta.com ADMIN
# Yönetici/moderatör uygulamada Profil → kalkan simgesi (veya Ayarlar → Moderasyon paneli)
# ile şikayetleri, iyileşen onaylarını, kullanıcıları ve işlem kayıtlarını yönetir.
# Diğer moderatörler panelden atanabilir (Kullanıcılar → Rolü "Moderatör" yap).

# 3. Mobil uygulama (ayrı terminalde)
cd mobile
npm install
npx expo start
```

> Gerçek cihazda test ederken `mobile/app.json` içindeki `extra.apiUrl` değerini bilgisayarınızın yerel IP adresiyle değiştirin (ör. `http://192.168.1.20:3000/api/v1`).

> SMTP ayarlanmamışsa doğrulama ve şifre sıfırlama kodları backend konsoluna yazdırılır.

## Testler

Backend, ayrı bir test veritabanında (`onkobag_test`) çalışan 70 entegrasyon testine sahiptir: kimlik doğrulama, profil/takip/engelleme, sohbet odaları (ölçeklenme ve eşzamanlılık dahil), Socket.io ile anlık mesajlaşma, özel mesajlar, gönderiler ve moderasyon.

```bash
cd backend
npm run test:db   # test veritabanını oluşturur, migration ve seed uygular (bir kez)
npm test
```

## Dokümantasyon

- [Veri modeli ve ER diyagramı](docs/veritabani.md)
- [API ve Socket.io olay referansı](docs/api.md)
- [Google ve Apple ile giriş kurulumu](docs/sosyal-giris-kurulum.md)
- [E-posta (SMTP) kurulumu](docs/e-posta-kurulum.md)
- [Yayın: Render'a kurulum ve test sürümü dağıtma](docs/yayin.md)

## Güncel Durum

- [x] Veritabanı şeması (22 tablo, 3 migration, seed)
- [x] Proje iskeleti (backend + mobil)
- [x] Backend: REST API (10 modül) + Socket.io + 70 entegrasyon testi
- [x] Mobil uygulama: kayıt/giriş, akış, gönderiler, sohbet odaları, özel mesajlar, profil, ayarlar, şikayet/engelleme, yasal metinler
- [x] Moderasyon paneli (şikayetler, iyileşen onayı, kullanıcı yönetimi, işlem kayıtları)
- [ ] Push bildirimleri, mağaza yayını
