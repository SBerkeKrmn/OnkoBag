import Constants from 'expo-constants';

// Backend adresi app.json > expo.extra.apiUrl üzerinden gelir.
// Not: Gerçek cihazda "localhost" bilgisayarı göstermez; bilgisayarın yerel IP
// adresi (ör. http://192.168.1.20:3000/api/v1) kullanılmalıdır.
export const API_URL = Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:3000/api/v1';

/** Socket.io sunucusu API ile aynı adreste, /api/v1 öneki olmadan çalışır */
export const SOCKET_URL = API_URL.replace(/\/api\/v\d+\/?$/, '');

export const APP_NAME = 'OnkoBağ';

/** Destek ve iletişim adresi (mağaza kuralları gereği uygulama içinde erişilebilir olmalı) */
export const SUPPORT_EMAIL = 'berkekaraman03@gmail.com';

/** Acil durum numarası (Türkiye) */
export const EMERGENCY_NUMBER = '112';
