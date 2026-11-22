// Oturum token'larının saklanması.
// iOS/Android: expo-secure-store (Keychain / Keystore ile şifreli).
// Web (yalnızca geliştirme önizlemesi): localStorage.
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const isWeb = Platform.OS === 'web';

export async function getItem(key) {
  if (isWeb) return globalThis.localStorage?.getItem(key) ?? null;
  return SecureStore.getItemAsync(key);
}

export async function setItem(key, value) {
  if (isWeb) return globalThis.localStorage?.setItem(key, value);
  return SecureStore.setItemAsync(key, value);
}

export async function removeItem(key) {
  if (isWeb) return globalThis.localStorage?.removeItem(key);
  return SecureStore.deleteItemAsync(key);
}
