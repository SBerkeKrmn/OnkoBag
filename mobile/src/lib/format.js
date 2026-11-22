// Tarih ve metin biçimlendirme yardımcıları (Türkçe)

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "şimdi", "5 dk", "3 sa", "2 g", "12 Mar" */
export function timeAgo(value) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (diff < MINUTE) return 'şimdi';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} dk`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} sa`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)} g`;
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
}

/** "14:05" */
export const clockTime = (value) =>
  new Date(value).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

/** Sohbet gün ayırıcısı: "Bugün", "Dün", "12 Mart 2026" */
export function dayLabel(value) {
  const date = new Date(value);
  const today = new Date();
  const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOf(today) - startOf(date)) / DAY);
  if (diffDays === 0) return 'Bugün';
  if (diffDays === 1) return 'Dün';
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

/** Görünen ad: varsa ad, yoksa @kullanıcıadı */
export const displayNameOf = (user) => (user ? user.displayName || user.username : 'Silinmiş kullanıcı');

export const POST_CATEGORIES = [
  { value: 'EXPERIENCE', label: 'Deneyim', icon: 'chatbubble-ellipses-outline' },
  { value: 'QUESTION', label: 'Soru', icon: 'help-circle-outline' },
  { value: 'TREATMENT', label: 'Tedavi süreci', icon: 'medkit-outline' },
  { value: 'SIDE_EFFECTS', label: 'Yan etkiler', icon: 'pulse-outline' },
  { value: 'MOTIVATION', label: 'Motivasyon', icon: 'sunny-outline' },
  { value: 'DAILY_LIFE', label: 'Günlük yaşam', icon: 'cafe-outline' },
  { value: 'OTHER', label: 'Diğer', icon: 'ellipsis-horizontal-circle-outline' },
];

export const categoryOf = (value) => POST_CATEGORIES.find((c) => c.value === value) ?? POST_CATEGORIES[6];

export const statusLabel = (status) => (status === 'SURVIVOR' ? 'İyileşen' : 'Aktif tedavide');
