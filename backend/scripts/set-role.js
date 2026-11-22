// Kayıtlı bir kullanıcının sistem rolünü değiştirir. İlk yönetici hesabını
// oluşturmak için kullanılır (sonrakiler panelden atanabilir).
// Kullanım: npm run user:set-role -- <e-posta> <USER|MODERATOR|ADMIN>
const prisma = require('../src/lib/prisma');

async function main() {
  const [email, role] = process.argv.slice(2);
  const roles = ['USER', 'MODERATOR', 'ADMIN'];

  if (!email || !roles.includes(role)) {
    console.error('Kullanım: npm run user:set-role -- <e-posta> <USER|MODERATOR|ADMIN>');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    console.error(`Kullanıcı bulunamadı: ${email}`);
    process.exit(1);
  }

  await prisma.user.update({ where: { id: user.id }, data: { role } });
  console.log(`${user.username} kullanıcısının rolü ${role} olarak güncellendi.`);
}

main().finally(() => prisma.$disconnect());
