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
│       ├── config/           # Ortam değişkenleri (zod ile doğrulanır)
│       ├── lib/              # Prisma istemcisi
│       ├── middlewares/      # JWT doğrulama, rol kontrolü, hata yönetimi
│       ├── modules/          # Özellik modülleri (auth, posts, rooms ...)
│       ├── routes/           # /api/v1 router'ı
│       ├── sockets/          # Socket.io sunucusu
│       ├── utils/
│       ├── app.js            # Express uygulaması
│       └── server.js         # Giriş noktası (HTTP + Socket.io)
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
cp .env.example .env          # JWT secret değerlerini değiştirin
npm install
npx prisma migrate deploy     # tabloları oluştur
npx prisma db seed            # kanser türleri ve odalar
npm run dev                   # http://localhost:3000/api/v1/health

# 3. Mobil uygulama (ayrı terminalde)
cd mobile
npm install
npx expo start
```

> Gerçek cihazda test ederken `mobile/app.json` içindeki `extra.apiUrl` değerini bilgisayarınızın yerel IP adresiyle değiştirin (ör. `http://192.168.1.20:3000/api/v1`).

## API

| Metot | Uç nokta | Açıklama |
|---|---|---|
| GET | `/api/v1/health` | Sunucu ve veritabanı durumu |
| GET | `/api/v1/cancer-types` | Aktif kanser türleri listesi |

## Dokümantasyon

- [Veri modeli](docs/veritabani.md)

## Güncel Durum

- [x] Veritabanı şeması tasarlandı (22 tablo, migration + seed)
- [x] Proje iskeleti (backend + mobil)
- [ ] Backend (REST API + Socket.io)
- [ ] Mobil uygulama
