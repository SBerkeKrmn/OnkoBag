// =============================================================================
// OnkoBağ — Başlangıç verisi (seed)
// Çalıştırma: npx prisma db seed
//
// - Kanser türlerini ekler (idempotent: slug üzerinden upsert)
// - Her kanser türü için varsayılan genel sohbet odasını (#1) oluşturur
// Gerçek kişilere ait veri İÇERMEZ.
// =============================================================================

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const CANCER_TYPES = [
  { name: 'Meme Kanseri', slug: 'meme-kanseri' },
  { name: 'Akciğer Kanseri', slug: 'akciger-kanseri' },
  { name: 'Kolorektal (Kalın Bağırsak) Kanseri', slug: 'kolorektal-kanser' },
  { name: 'Prostat Kanseri', slug: 'prostat-kanseri' },
  { name: 'Mide Kanseri', slug: 'mide-kanseri' },
  { name: 'Tiroid Kanseri', slug: 'tiroid-kanseri' },
  { name: 'Lösemi', slug: 'losemi' },
  { name: 'Lenfoma', slug: 'lenfoma' },
  { name: 'Multipl Miyelom', slug: 'multipl-miyelom' },
  { name: 'Mesane Kanseri', slug: 'mesane-kanseri' },
  { name: 'Böbrek Kanseri', slug: 'bobrek-kanseri' },
  { name: 'Pankreas Kanseri', slug: 'pankreas-kanseri' },
  { name: 'Karaciğer Kanseri', slug: 'karaciger-kanseri' },
  { name: 'Yemek Borusu (Özofagus) Kanseri', slug: 'ozofagus-kanseri' },
  { name: 'Yumurtalık (Over) Kanseri', slug: 'over-kanseri' },
  { name: 'Rahim (Endometrium) Kanseri', slug: 'endometrium-kanseri' },
  { name: 'Rahim Ağzı (Serviks) Kanseri', slug: 'serviks-kanseri' },
  { name: 'Testis Kanseri', slug: 'testis-kanseri' },
  { name: 'Beyin ve Sinir Sistemi Tümörleri', slug: 'beyin-tumorleri' },
  { name: 'Baş ve Boyun Kanserleri', slug: 'bas-boyun-kanserleri' },
  { name: 'Cilt Kanseri (Melanom)', slug: 'melanom' },
  { name: 'Kemik ve Yumuşak Doku Sarkomları', slug: 'sarkom' },
  { name: 'Çocukluk Çağı Kanserleri', slug: 'cocukluk-cagi-kanserleri' },
  { name: 'Diğer Kanser Türleri', slug: 'diger' },
];

async function main() {
  for (const [index, ct] of CANCER_TYPES.entries()) {
    const cancerType = await prisma.cancerType.upsert({
      where: { slug: ct.slug },
      update: { name: ct.name, sortOrder: index },
      create: { name: ct.name, slug: ct.slug, sortOrder: index },
    });

    await prisma.chatRoom.upsert({
      where: {
        cancerTypeId_roomNumber: { cancerTypeId: cancerType.id, roomNumber: 1 },
      },
      update: {},
      create: {
        cancerTypeId: cancerType.id,
        roomNumber: 1,
        name: `${cancerType.name} Genel Sohbet`,
        description: `${cancerType.name} ile mücadele eden ve bu hastalığı atlatmış kişilerin buluşma alanı.`,
        isDefault: true,
      },
    });
  }

  console.log(`Seed tamamlandı: ${CANCER_TYPES.length} kanser türü ve varsayılan odaları.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
