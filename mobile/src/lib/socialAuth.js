// Google ve Apple ile giriş (istemci tarafı).
// İstemci yalnızca sağlayıcıdan kimlik token'ını alır; doğrulama backend'de yapılır.
//
// Notlar:
// - Apple ile giriş yalnızca iOS'ta sunulur (Apple'ın yerel düğmesiyle).
// - Google ile giriş yerel modül gerektirir: Expo Go'da çalışmaz, development
//   build (npx expo run:ios|android veya EAS) gerekir. Ayrıca app.json'da
//   googleWebClientId tanımlı olmalıdır.
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from '../constants/config';

export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export async function isAppleAvailable() {
  if (Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

export const isGoogleAvailable = () => Platform.OS !== 'web' && !isExpoGo && Boolean(GOOGLE_WEB_CLIENT_ID);

// Yerel modül yalnızca gerektiğinde yüklenir (Expo Go'da yüklenirse uygulama çöker)
let google = null;
function loadGoogle() {
  if (!google) {
    // eslint-disable-next-line global-require
    google = require('@react-native-google-signin/google-signin');
    google.GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      ...(GOOGLE_IOS_CLIENT_ID ? { iosClientId: GOOGLE_IOS_CLIENT_ID } : {}),
    });
  }
  return google;
}

/** Kullanıcı iptal ederse null döner */
export async function signInWithGoogle() {
  const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = loadGoogle();
  try {
    if (Platform.OS === 'android') await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const res = await GoogleSignin.signIn();
    if (!isSuccessResponse(res)) return null;
    if (!res.data.idToken) throw new Error('Google kimlik bilgisi alınamadı');
    return { provider: 'GOOGLE', idToken: res.data.idToken };
  } catch (err) {
    if (isErrorWithCode(err) && [statusCodes.SIGN_IN_CANCELLED, statusCodes.IN_PROGRESS].includes(err.code)) return null;
    throw err;
  }
}

/**
 * Apple ile giriş. Tekrar oynatma saldırılarına karşı rastgele bir nonce üretilir:
 * Apple'a SHA-256 özeti gönderilir, backend ham değerle eşleştirir.
 * Kullanıcı iptal ederse null döner.
 */
export async function signInWithApple() {
  const rawNonce = `${Crypto.randomUUID()}${Crypto.randomUUID()}`;
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
    if (!credential.identityToken) throw new Error('Apple kimlik bilgisi alınamadı');
    const name = credential.fullName
      ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ')
      : '';
    return { provider: 'APPLE', idToken: credential.identityToken, nonce: rawNonce, fullName: name || undefined };
  } catch (err) {
    if (err?.code === 'ERR_REQUEST_CANCELED') return null;
    throw err;
  }
}

/** Çıkışta Google oturumunu da kapatır (sonraki girişte hesap seçici tekrar açılsın) */
export async function signOutSocial() {
  if (!google) return;
  try {
    await google.GoogleSignin.signOut();
  } catch {
    // yoksay
  }
}
