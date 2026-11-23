// Oturum durumu: token'ların güvenli saklanması, açılışta oturumun geri
// yüklenmesi, giriş/kayıt/çıkış ve güncel kullanıcı bilgisi.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, usersApi } from '../api';
import { setSession, setSessionHandlers, getRefreshToken } from '../api/client';
import { getItem, setItem, removeItem } from '../lib/storage';
import { queryClient } from '../lib/queryClient';
import { signOutSocial } from '../lib/socialAuth';
import { registerForPushNotifications, unregisterPushNotifications } from '../lib/pushNotifications';

const TOKENS_KEY = 'onkobag.session';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [status, setStatus] = useState('loading'); // loading | signedOut | signedIn
  const [user, setUser] = useState(null);

  const clearSession = useCallback(async () => {
    setSession(null);
    await removeItem(TOKENS_KEY);
    queryClient.clear();
    setUser(null);
    setStatus('signedOut');
  }, []);

  const saveTokens = useCallback(async ({ accessToken, refreshToken }) => {
    setSession({ accessToken, refreshToken });
    await setItem(TOKENS_KEY, JSON.stringify({ accessToken, refreshToken }));
  }, []);

  useEffect(() => {
    setSessionHandlers({ onTokens: saveTokens, onExpired: clearSession });

    (async () => {
      try {
        const stored = await getItem(TOKENS_KEY);
        if (!stored) {
          setStatus('signedOut');
          return;
        }
        setSession(JSON.parse(stored));
        const { data } = await usersApi.me();
        setUser(data);
        setStatus('signedIn');
      } catch (err) {
        // Ağ hatasında oturumu silme; yalnızca yetki hatasında çıkış yap
        if (err?.code === 'NETWORK_ERROR') {
          setStatus('signedOut');
          setSession(null);
        } else {
          await clearSession();
        }
      }
    })();
  }, [saveTokens, clearSession]);

  const startSession = useCallback(
    async ({ user: nextUser, accessToken, refreshToken }) => {
      await saveTokens({ accessToken, refreshToken });
      setUser(nextUser);
      setStatus('signedIn');
    },
    [saveTokens],
  );

  const login = useCallback(async (email, password) => {
    const { data } = await authApi.login({ email, password });
    await startSession(data);
    return data.user;
  }, [startSession]);

  const register = useCallback(async (payload) => {
    const { data } = await authApi.register(payload);
    await startSession(data);
    return data.user;
  }, [startSession]);

  /**
   * Google/Apple ile giriş. Sonuç:
   *  { status: 'AUTHENTICATED', user } → oturum açıldı
   *  { status: 'PROFILE_REQUIRED', signupToken, profile } → kayıt tamamlanmalı
   */
  const socialSignIn = useCallback(
    async (credential) => {
      const { data } = await authApi.social(credential);
      if (data.status === 'AUTHENTICATED') await startSession(data);
      return data;
    },
    [startSession],
  );

  const completeSocialSignup = useCallback(
    async (payload) => {
      const { data } = await authApi.socialComplete(payload);
      await startSession(data);
      return data.user;
    },
    [startSession],
  );

  // Oturum açıkken telefon bildirimleri için cihaz kaydedilir
  useEffect(() => {
    if (status !== 'signedIn') return;
    registerForPushNotifications().catch((err) => console.warn('Bildirim kaydı yapılamadı:', err?.message));
  }, [status]);

  const logout = useCallback(async () => {
    await unregisterPushNotifications();
    const refreshToken = getRefreshToken();
    if (refreshToken) await authApi.logout(refreshToken).catch(() => {});
    await signOutSocial();
    await clearSession();
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    const { data } = await usersApi.me();
    setUser(data);
    return data;
  }, []);

  const value = useMemo(
    () => ({
      status,
      user,
      setUser,
      login,
      register,
      socialSignIn,
      completeSocialSignup,
      logout,
      refreshUser,
      saveTokens,
      clearSession,
    }),
    [status, user, login, register, socialSignIn, completeSocialSignup, logout, refreshUser, saveTokens, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth, AuthProvider içinde kullanılmalı');
  return ctx;
}
