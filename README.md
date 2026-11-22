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
├── backend/          # Node.js + Express API ve Socket.io sunucusu
│   └── prisma/       # Veritabanı şeması, ek SQL kısıtları, seed
├── mobile/           # React Native uygulaması (yakında)
└── docs/             # Tasarım dokümanları
```

## Dokümantasyon

- [Veri modeli](docs/veritabani.md)

## Güncel Durum

- [x] Veritabanı şeması tasarlandı
- [ ] Proje iskeleti
- [ ] Backend (REST API + Socket.io)
- [ ] Mobil uygulama
