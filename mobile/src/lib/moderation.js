// Şikayet ve moderasyon etiketleri (şikayet ekranı ve moderasyon paneli ortak kullanır)

export const REPORT_REASONS = [
  { value: 'HARASSMENT', label: 'Taciz veya zorbalık', icon: 'hand-left-outline' },
  { value: 'MISINFORMATION', label: 'Yanlış veya tehlikeli tıbbi bilgi', icon: 'medkit-outline' },
  { value: 'SELF_HARM', label: 'Kendine zarar verme riski', icon: 'heart-dislike-outline' },
  { value: 'INAPPROPRIATE_CONTENT', label: 'Uygunsuz veya rahatsız edici içerik', icon: 'eye-off-outline' },
  { value: 'SPAM', label: 'Spam, reklam veya dolandırıcılık', icon: 'megaphone-outline' },
  { value: 'IMPERSONATION', label: 'Sahte hesap / kimliğe bürünme', icon: 'person-remove-outline' },
  { value: 'OTHER', label: 'Diğer', icon: 'ellipsis-horizontal-circle-outline' },
];

export const reasonOf = (value) => REPORT_REASONS.find((r) => r.value === value) ?? REPORT_REASONS[6];

export const TARGET_TYPES = {
  USER: { label: 'Kullanıcı', icon: 'person-outline' },
  POST: { label: 'Gönderi', icon: 'document-text-outline' },
  COMMENT: { label: 'Yorum', icon: 'chatbubble-outline' },
  ROOM_MESSAGE: { label: 'Oda mesajı', icon: 'chatbubbles-outline' },
  DIRECT_MESSAGE: { label: 'Özel mesaj', icon: 'mail-outline' },
};

export const REPORT_STATUSES = [
  { value: 'PENDING', label: 'Bekleyen' },
  { value: 'IN_REVIEW', label: 'İnceleniyor' },
  { value: 'RESOLVED', label: 'Çözüldü' },
  { value: 'DISMISSED', label: 'Reddedildi' },
];

export const ROLE_LABELS = { USER: 'Kullanıcı', MODERATOR: 'Moderatör', ADMIN: 'Yönetici' };

export const USER_STATUS_LABELS = { ACTIVE: 'Aktif', SUSPENDED: 'Askıda', DELETED: 'Silinmiş' };

export const isModerator = (user) => user?.role === 'MODERATOR' || user?.role === 'ADMIN';

export const ACTION_LABELS = {
  HIDE_CONTENT: 'İçerik gizlendi',
  RESTORE_CONTENT: 'İçerik geri yüklendi',
  WARN_USER: 'Kullanıcı uyarıldı',
  SUSPEND_USER: 'Kullanıcı askıya alındı',
  UNSUSPEND_USER: 'Askı kaldırıldı',
  CHANGE_ROLE: 'Rol değiştirildi',
  VERIFY_SURVIVOR: 'İyileşen doğrulandı',
  REVOKE_SURVIVOR: 'İyileşen rozeti kaldırıldı',
  RESOLVE_REPORT: 'Şikayet sonuçlandırıldı',
  SILENCE_IN_ROOM: 'Odada susturuldu',
  CREATE_ROOM: 'Oda oluşturuldu',
  UPDATE_ROOM: 'Oda güncellendi',
  CLOSE_ROOM: 'Oda kapatıldı',
  CREATE_CANCER_TYPE: 'Kanser türü eklendi',
  UPDATE_CANCER_TYPE: 'Kanser türü güncellendi',
};

export const HIDE_PRESETS = ['Topluluk kurallarına aykırı', 'Yanlış tıbbi bilgi', 'Taciz / hakaret', 'Spam / reklam'];
export const WARN_PRESETS = ['Saygılı bir dil kullanmalısın', 'Tedavi/ilaç önerisi vermemelisin', 'Spam paylaşımı yapmamalısın'];
export const SUSPEND_DURATIONS = [
  { label: '1 gün', days: 1 },
  { label: '7 gün', days: 7 },
  { label: '30 gün', days: 30 },
  { label: 'Süresiz', days: null },
];
