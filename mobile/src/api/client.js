// Backend HTTP istemcisi.
// - Access token'ı her isteğe ekler
// - 401 alındığında refresh token ile oturumu bir kez yeniler ve isteği tekrarlar
//   (aynı anda gelen 401'ler tek bir yenileme isteğini paylaşır)
// - Hataları { message, code, status, details } içeren ApiError'a çevirir
import { Platform } from 'react-native';
import { API_URL } from '../constants/config';

export class ApiError extends Error {
  constructor(message, { status, code, details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const session = { accessToken: null, refreshToken: null };
const handlers = { onTokens: null, onExpired: null };

export function setSession(tokens) {
  session.accessToken = tokens?.accessToken ?? null;
  session.refreshToken = tokens?.refreshToken ?? null;
}

export const getAccessToken = () => session.accessToken;
export const getRefreshToken = () => session.refreshToken;

/** AuthContext, yeni token'ları kalıcı saklamak ve oturum düşünce çıkış yapmak için kaydolur */
export function setSessionHandlers({ onTokens, onExpired }) {
  handlers.onTokens = onTokens;
  handlers.onExpired = onExpired;
}

let refreshPromise = null;

/** Oturumu yeniler. Başarılıysa true, refresh token geçersizse false döner. */
export function refreshSession() {
  if (!session.refreshToken) return Promise.resolve(false);
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: session.refreshToken }),
        });
        if (!res.ok) {
          if (res.status === 401) await handlers.onExpired?.();
          return false;
        }
        const { data } = await res.json();
        setSession(data);
        await handlers.onTokens?.(data);
        return true;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

async function send(path, { method = 'GET', body, form, auth = true }) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && session.accessToken) headers.Authorization = `Bearer ${session.accessToken}`;

  try {
    return await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch (err) {
    // Geliştirmede asıl nedeni konsolda göster (ağ hatası mı, istek mi kurulamadı?)
    if (__DEV__) console.warn(`İstek başarısız: ${method} ${path}`, err?.message);
    throw new ApiError('Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.', { code: 'NETWORK_ERROR' });
  }
}

/**
 * API isteği. Yanıt gövdesini döner ({ data } veya sayfalı { data, nextCursor }).
 * @param {object} opts { method, body, form (FormData), auth }
 */
export async function request(path, opts = {}) {
  let res = await send(path, opts);

  if (res.status === 401 && opts.auth !== false && session.refreshToken) {
    const refreshed = await refreshSession();
    if (refreshed) res = await send(path, opts);
  }

  if (res.status === 204) return null;

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const err = payload?.error ?? {};
    throw new ApiError(err.message ?? 'Beklenmeyen bir hata oluştu', {
      status: res.status,
      code: err.code,
      details: err.details,
    });
  }
  return payload;
}

/**
 * Telefonda dosya yükleme XMLHttpRequest ile yapılır: Expo SDK 58'in global
 * fetch'i (expo/fetch) React Native'in { uri, name, type } dosya parçasını
 * desteklemez ve istek gönderilmeden hata verir. XHR bu biçimi yerel olarak
 * dosyadan okuyup gönderir.
 */
function xhrUpload(path, form) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}${path}`);
    xhr.setRequestHeader('Accept', 'application/json');
    if (session.accessToken) xhr.setRequestHeader('Authorization', `Bearer ${session.accessToken}`);
    xhr.timeout = 120_000;
    xhr.onload = () => {
      let payload = null;
      try {
        payload = JSON.parse(xhr.responseText);
      } catch {
        // gövde JSON değil
      }
      resolve({ status: xhr.status, payload });
    };
    xhr.onerror = () => reject(new ApiError('Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.', { code: 'NETWORK_ERROR' }));
    xhr.ontimeout = () => reject(new ApiError('Yükleme zaman aşımına uğradı. Daha küçük bir görsel deneyin.', { code: 'TIMEOUT' }));
    xhr.send(form);
  });
}

/** Görsel yükleme (multipart/form-data). asset: expo-image-picker sonucu */
export async function uploadImage(asset) {
  const name = asset.fileName ?? `gorsel-${Date.now()}.jpg`;
  const type = asset.mimeType ?? 'image/jpeg';

  if (Platform.OS === 'web') {
    const form = new FormData();
    const blob = await (await fetch(asset.uri)).blob();
    form.append('file', blob, name);
    const res = await request('/media', { method: 'POST', form });
    return res.data;
  }

  const makeForm = () => {
    const form = new FormData();
    form.append('file', { uri: asset.uri, name, type });
    return form;
  };

  let { status, payload } = await xhrUpload('/media', makeForm());
  if (status === 401 && session.refreshToken && (await refreshSession())) {
    ({ status, payload } = await xhrUpload('/media', makeForm()));
  }
  if (status < 200 || status >= 300) {
    const err = payload?.error ?? {};
    throw new ApiError(err.message ?? 'Görsel yüklenemedi', { status, code: err.code, details: err.details });
  }
  return payload.data;
}
