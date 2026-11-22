import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

/** Şema (http/https) unutulmuşsa ekler, sondaki "/" işaretini kaldırır */
function normalizeUrl(url) {
  const trimmed = String(url).trim().replace(/\/+$/, '');
  return /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
}

// Backend adresi app.json > expo.extra.apiUrl üzerinden gelir.
// Not: Gerçek cihazda "localhost" bilgisayarı göstermez; bilgisayarın yerel IP
// adresi (ör. http://192.168.1.20:3000/api/v1) kullanılmalıdır.
export const API_URL = normalizeUrl(extra.apiUrl ?? 'http://localhost:3000/api/v1');

/** Socket.io sunucusu API ile aynı adreste, /api/v1 öneki olmadan çalışır */
export const SOCKET_URL = API_URL.replace(/\/api\/v\d+\/?$/, '');

/** Google ile giriş: Google Cloud Console'daki OAuth istemci kimlikleri */
export const GOOGLE_WEB_CLIENT_ID = extra.googleWebClientId || null;
export const GOOGLE_IOS_CLIENT_ID = extra.googleIosClientId || null;

export const APP_NAME = 'OnkoBağ';

/** Destek ve iletişim adresi (mağaza kuralları gereği uygulama içinde erişilebilir olmalı) */
export const SUPPORT_EMAIL = 'berkekaraman03@gmail.com';

/** Acil durum numarası (Türkiye) */
export const EMERGENCY_NUMBER = '112';
