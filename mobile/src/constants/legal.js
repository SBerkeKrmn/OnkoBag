// Uygulama içi yasal metinler.
// ÖNEMLİ: Bu metinler bitirme projesi kapsamında hazırlanmış taslaklardır.
// Uygulama mağazalarda yayımlanmadan önce bir hukuk uzmanı tarafından
// gözden geçirilmeli ve veri sorumlusu bilgileri tamamlanmalıdır.
import { SUPPORT_EMAIL, EMERGENCY_NUMBER } from './config';

const UPDATED = '22 Kasım 2026';

export const LEGAL_DOCS = {
  terms: {
    title: 'Kullanım Şartları',
    updated: UPDATED,
    sections: [
      {
        heading: '1. Hizmetin tanımı',
        body: 'OnkoBağ; kanser tedavisi gören kişiler ile kanseri atlatmış kişileri aynı kanser türüne özgü topluluklarda bir araya getiren, akran desteğine dayalı bir iletişim platformudur. OnkoBağ bir sağlık hizmeti sunucusu değildir.',
      },
      {
        heading: '2. Kimler kullanabilir',
        body: 'OnkoBağ yalnızca 18 yaşını doldurmuş kişiler tarafından kullanılabilir. Hesap oluştururken verdiğin bilgilerin doğru olduğunu kabul edersin. Başka bir kişinin kimliğine bürünmek yasaktır.',
      },
      {
        heading: '3. Tıbbi tavsiye değildir',
        body: 'Platformda paylaşılan içerikler kullanıcıların kişisel deneyimleridir ve tıbbi tavsiye, teşhis veya tedavi önerisi niteliği taşımaz. Sağlığınla ilgili her karar için hekimine danış. Tedavini, bir kullanıcının paylaşımına dayanarak değiştirme veya bırakma.',
      },
      {
        heading: '4. Kullanıcı içeriği',
        body: 'Paylaştığın gönderi, yorum ve mesajlardan sen sorumlusun. İçeriklerin, hizmetin sunulması amacıyla OnkoBağ tarafından saklanır ve topluluğun diğer üyelerine gösterilir. Topluluk Kuralları’na aykırı içerikler uyarı yapılmaksızın kaldırılabilir.',
      },
      {
        heading: '5. Uygunsuz içeriğe sıfır tolerans',
        body: 'Taciz, nefret söylemi, tehdit, müstehcenlik, spam, ticari tanıtım ve tehlikeli tıbbi yanlış bilgilendirme kesinlikle yasaktır. Uygunsuz içerikleri ve kullanıcıları uygulama içinden şikayet edebilir, kullanıcıları engelleyebilirsin. Şikayetler moderatörlerimiz tarafından en kısa sürede incelenir; ihlal eden içerikler kaldırılır ve hesaplar askıya alınabilir veya kalıcı olarak kapatılabilir.',
      },
      {
        heading: '6. Hesabın sonlandırılması',
        body: 'Hesabını dilediğin zaman Ayarlar > Hesabı sil adımından kalıcı olarak silebilirsin. Kurallara aykırı davranış durumunda hesabın askıya alınabilir veya kapatılabilir.',
      },
      {
        heading: '7. Sorumluluğun sınırlandırılması',
        body: 'OnkoBağ, kullanıcıların paylaştığı bilgilerin doğruluğunu garanti etmez ve bu bilgilere dayanılarak verilen kararlardan sorumlu tutulamaz. Hizmet “olduğu gibi” sunulur.',
      },
      {
        heading: '8. Değişiklikler ve iletişim',
        body: `Bu şartlar güncellenebilir; önemli değişikliklerde uygulama içinde bilgilendirme yapılır. Sorularını ${SUPPORT_EMAIL} adresine iletebilirsin.`,
      },
    ],
  },

  privacy: {
    title: 'Gizlilik Politikası ve KVKK Aydınlatma Metni',
    updated: UPDATED,
    sections: [
      {
        heading: 'Veri sorumlusu',
        body: `OnkoBağ, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında veri sorumlusudur. İletişim: ${SUPPORT_EMAIL}`,
      },
      {
        heading: 'Hangi verileri işliyoruz',
        body: '• Hesap bilgileri: e-posta adresi, kullanıcı adı, isteğe bağlı görünen ad, profil fotoğrafı, biyografi, doğum yılı, cinsiyet ve şehir.\n• Sağlık verisi (özel nitelikli kişisel veri): kanser türün, tedavi durumun (aktif tedavide / iyileşen), isteğe bağlı tanı ve remisyon yılların.\n• İçerikler: gönderiler, yorumlar, sohbet odası ve özel mesajlar, yüklediğin görseller.\n• Teknik veriler: oturum bilgileri, cihaz bilgisi, IP adresi, push bildirim anahtarı.',
      },
      {
        heading: 'Hangi amaçlarla',
        body: 'Seni kanser türüne uygun topluluk ve sohbet odalarına yönlendirmek, aynı yolu yürümüş kişilerle eşleştirmek, mesajlaşmayı sağlamak, hesabının güvenliğini korumak, şikayetleri incelemek ve yasal yükümlülükleri yerine getirmek.',
      },
      {
        heading: 'Hukuki sebep ve açık rıza',
        body: 'Sağlık verilerin yalnızca kayıt sırasında verdiğin açık rızaya dayanılarak işlenir (KVKK m. 6). Diğer veriler sözleşmenin ifası ve meşru menfaat hukuki sebeplerine dayanır. Açık rızanı dilediğin zaman hesabını silerek geri alabilirsin.',
      },
      {
        heading: 'Kimler görebilir',
        body: 'Kullanıcı adın, görünen adın, profil fotoğrafın, birincil kanser türün ve durumun diğer kullanıcılara gösterilir. E-posta adresin hiçbir kullanıcıyla paylaşılmaz. Özel mesajları yalnızca sohbetin tarafları görür; şikayet edilen içerikler moderatörlerce incelenebilir. Verilerin reklam amacıyla üçüncü kişilerle paylaşılmaz ve satılmaz.',
      },
      {
        heading: 'Hizmet sağlayıcılar ve yurt dışına aktarım',
        body: 'Uygulamanın sunucusu ve veritabanı Render (Frankfurt, Almanya) üzerinde barındırılır. Doğrulama kodu e-postaları e-posta servis sağlayıcısı aracılığıyla, telefon bildirimleri Expo (Google Firebase / Apple) aracılığıyla iletilir; bildirim metni kısa tutulur. Google veya Apple ile giriş yaparsan bu şirketlerden yalnızca kimlik doğrulaması ve e-posta adresin alınır. Bu nedenle verilerin yurt dışındaki sunucularda işlenir; kayıt sırasında verdiğin açık rıza bu aktarımı da kapsar (KVKK m. 9).',
      },
      {
        heading: 'Saklama ve güvenlik',
        body: 'Veriler şifreli bağlantı (HTTPS/WSS) üzerinden iletilir. Şifreler geri döndürülemez biçimde (bcrypt) saklanır; oturum anahtarları cihazında güvenli depoda tutulur. Sildiğin mesaj, gönderi, yorum ve görseller veritabanından da silinir. Hesabını sildiğinde kişisel verilerin, kanser profillerin, mesajlarının metni ve yüklediğin görseller silinir; hesabın anonimleştirilir. Moderasyon kayıtları, topluluk güvenliği için kişisel veri içermeyecek biçimde saklanır.',
      },
      {
        heading: 'Haklarınız',
        body: `KVKK m. 11 kapsamında verilerine erişme, düzeltilmesini veya silinmesini isteme, işlenmesine itiraz etme haklarına sahipsin. Ayarlar → “Verilerimin kopyası” ile tüm verilerin e-posta adresine gönderilir; profilini uygulama içinden düzenleyebilir, hesabını silebilir veya taleplerini ${SUPPORT_EMAIL} adresine iletebilirsin.`,
      },
    ],
  },

  community: {
    title: 'Topluluk Kuralları',
    updated: UPDATED,
    sections: [
      {
        heading: 'Burası güvenli bir alan',
        body: 'OnkoBağ, zor bir yolculuktan geçen insanların birbirine destek olduğu bir topluluk. Herkesin deneyimi farklıdır; nazik, sabırlı ve saygılı ol.',
      },
      {
        heading: 'Yapılacaklar',
        body: '• Kendi deneyimini paylaş, “ben” diliyle konuş.\n• Soru soranlara anlayışla yaklaş.\n• İyileşen bir üye olarak umut ver ama gerçekçi ol.\n• Rahatsız edici bir içerik görürsen şikayet et.',
      },
      {
        heading: 'Yasak olanlar',
        body: '• Taciz, aşağılama, nefret söylemi ve tehdit.\n• Tedaviyi bırakmaya teşvik eden, kanıtlanmamış “mucize tedavi” veya ürün önerileri.\n• Reklam, satış, bağış toplama ve yönlendirme bağlantıları.\n• Başkalarının kişisel bilgilerini veya özel mesajlarını izinsiz paylaşma.\n• Müstehcen, şiddet içeren veya rahatsız edici görseller.\n• Sahte hesap açma ve başkasının kimliğine bürünme.',
      },
      {
        heading: 'Kendini veya başkasını tehlikede hissedersen',
        body: `Acil bir durum varsa hemen ${EMERGENCY_NUMBER}’yi ara. Bir kullanıcının kendine zarar verme riski taşıdığını düşünüyorsan içeriği “Kendine zarar verme riski” gerekçesiyle şikayet et; moderatörlerimize öncelikli olarak iletilir.`,
      },
      {
        heading: 'Yaptırımlar',
        body: 'Kurallara aykırı içerikler kaldırılır. İhlalin ağırlığına göre uyarı, sohbet odasında susturma, geçici askıya alma veya kalıcı hesap kapatma uygulanır.',
      },
    ],
  },

  medical: {
    title: 'Tıbbi Uyarı',
    updated: UPDATED,
    sections: [
      {
        heading: 'OnkoBağ tıbbi tavsiye vermez',
        body: 'OnkoBağ’daki tüm içerikler kullanıcıların kişisel deneyimlerinden oluşur. Hiçbir paylaşım; tıbbi tavsiye, teşhis veya tedavi önerisi yerine geçmez. Her kanser ve her beden farklıdır.',
      },
      {
        heading: 'Hekimine danış',
        body: 'Tedavin, ilaçların, yan etkiler ve beslenmenle ilgili her konuda yalnızca seni takip eden sağlık ekibinin önerilerine uy. Topluluktan duyduğun bir bilgiyi uygulamadan önce mutlaka hekiminle konuş.',
      },
      {
        heading: 'Acil durumlar',
        body: `Acil bir sağlık sorunu yaşıyorsan uygulamayı kullanma; hemen ${EMERGENCY_NUMBER}’yi ara veya en yakın acil servise başvur.`,
      },
    ],
  },
};

export const LEGAL_LINKS = [
  { key: 'terms', label: 'Kullanım Şartları', icon: 'document-text-outline' },
  { key: 'privacy', label: 'Gizlilik ve KVKK', icon: 'lock-closed-outline' },
  { key: 'community', label: 'Topluluk Kuralları', icon: 'people-outline' },
  { key: 'medical', label: 'Tıbbi Uyarı', icon: 'medkit-outline' },
];
