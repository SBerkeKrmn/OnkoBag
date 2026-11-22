import Constants from 'expo-constants';

// Backend adresi app.json > expo.extra.apiUrl üzerinden gelir.
// Not: Gerçek cihaz/emülatörde "localhost" bilgisayarı göstermez; bilgisayarın
// yerel IP adresi (ör. http://192.168.1.20:3000/api/v1) kullanılmalıdır.
export const API_URL = Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:3000/api/v1';
