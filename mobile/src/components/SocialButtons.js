// "Apple ile devam et" ve "Google ile devam et" düğmeleri.
// Apple düğmesi Apple'ın yerel bileşenidir (Apple tasarım kuralları gereği).
// App Store kuralı 4.8: Google ile giriş sunuluyorsa Apple ile giriş de en az
// aynı belirginlikte sunulmalıdır; iki düğme aynı boyuttadır ve Apple önce gelir.
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Text } from './ui';
import { useAuth } from '../context/AuthContext';
import { isAppleAvailable, isExpoGo, isGoogleAvailable, signInWithApple, signInWithGoogle } from '../lib/socialAuth';
import { setPendingSignup } from '../lib/pendingSignup';
import { colors, fonts, radius, spacing } from '../constants/theme';

const PROVIDER_NAMES = { GOOGLE: 'Google', APPLE: 'Apple' };

export function OrDivider({ label = 'veya' }) {
  return (
    <View style={styles.divider}>
      <View style={styles.line} />
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <View style={styles.line} />
    </View>
  );
}

/** divider: düğmeler gösterilirse altına "veya" ayırıcısı ekler */
export default function SocialButtons({ mode = 'continue', divider = false }) {
  const { socialSignIn } = useAuth();
  const [apple, setApple] = useState(false);
  const [busy, setBusy] = useState(null);
  const google = isGoogleAvailable();

  useEffect(() => {
    isAppleAvailable().then(setApple);
  }, []);

  const run = async (provider, getCredential) => {
    if (busy) return;
    setBusy(provider);
    try {
      const credential = await getCredential();
      if (!credential) return; // kullanıcı iptal etti
      const result = await socialSignIn(credential);
      if (result.status === 'AUTHENTICATED') {
        router.replace('/feed');
      } else {
        setPendingSignup({ provider, signupToken: result.signupToken, profile: result.profile });
        router.push({ pathname: '/register', params: { social: '1' } });
      }
    } catch (err) {
      Alert.alert(`${PROVIDER_NAMES[provider]} ile giriş yapılamadı`, err?.message ?? 'Lütfen tekrar dene.');
    } finally {
      setBusy(null);
    }
  };

  if (!apple && !google) {
    // Expo Go'da geliştirici için bilgi notu (yayınlanan uygulamada görünmez)
    return isExpoGo && __DEV__ ? (
      <Text variant="tiny" tone="muted" align="center">
        Geliştirme notu: Google ile giriş Expo Go’da çalışmaz (development build gerekir). Apple ile giriş yalnızca iOS’ta görünür.
      </Text>
    ) : null;
  }

  return (
    <View style={styles.container}>
      {apple ? (
        <View pointerEvents={busy ? 'none' : 'auto'} style={{ opacity: busy && busy !== 'APPLE' ? 0.5 : 1 }}>
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={
              mode === 'signup'
                ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
                : AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
            }
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={radius.pill}
            style={styles.appleButton}
            onPress={() => run('APPLE', signInWithApple)}
          />
        </View>
      ) : null}

      {google ? (
        <Pressable
          onPress={() => run('GOOGLE', signInWithGoogle)}
          disabled={Boolean(busy)}
          accessibilityRole="button"
          accessibilityLabel="Google ile devam et"
          style={({ pressed }) => [styles.googleButton, pressed && { backgroundColor: colors.surfaceMuted }, busy && busy !== 'GOOGLE' && { opacity: 0.5 }]}
        >
          {busy === 'GOOGLE' ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <>
              <Ionicons name="logo-google" size={20} color="#4285F4" />
              <Text style={styles.googleText}>Google ile devam et</Text>
            </>
          )}
        </Pressable>
      ) : null}
      {isExpoGo && __DEV__ && !google ? (
        <Text variant="tiny" tone="muted" align="center">
          Geliştirme notu: Google ile giriş Expo Go’da çalışmaz (development build gerekir).
        </Text>
      ) : null}
      {divider ? <OrDivider /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  appleButton: { width: '100%', height: 54 },
  googleButton: {
    height: 54,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#747775',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  googleText: { fontFamily: fonts.semibold, fontSize: 17, color: '#1F1F1F' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.xs },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
});
