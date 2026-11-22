import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Banner, Button, Header, Screen, Text } from '../../components/ui';
import CodeInput from '../../components/CodeInput';
import { authApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing } from '../../constants/theme';

const RESEND_SECONDS = 60;

export default function VerifyEmailScreen() {
  const { user, setUser } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const goHome = () => (router.canGoBack() ? router.back() : router.replace('/feed'));

  const verify = async (value = code) => {
    if (value.length !== 6) return;
    setError(null);
    setLoading(true);
    try {
      const { data } = await authApi.verifyEmail(value);
      setUser(data);
      router.replace('/feed');
    } catch (err) {
      setError(err.message);
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setError(null);
    try {
      await authApi.resendVerification();
      setInfo('Yeni kod gönderildi. Gelen kutunu ve gereksiz klasörünü kontrol et.');
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setError(err.message);
    }
  };

  if (user?.emailVerified) {
    return (
      <Screen header={<Header back title="E-posta doğrulama" />}>
        <Banner tone="survivor" title="E-posta adresin doğrulandı" message="Topluluğun tüm özelliklerini kullanabilirsin." />
      </Screen>
    );
  }

  return (
    <Screen scroll keyboard header={<Header back onBack={goHome} title="" />}>
      <View style={styles.container}>
        <View style={styles.icon}>
          <Ionicons name="mail-unread-outline" size={34} color={colors.primary} />
        </View>
        <Text variant="title" align="center">
          E-postanı doğrula
        </Text>
        <Text variant="body" tone="secondary" align="center">
          <Text variant="bodyStrong">{user?.email}</Text> adresine 6 haneli bir kod gönderdik.
        </Text>

        {error ? <Banner tone="danger" message={error} /> : null}
        {info && !error ? <Banner tone="info" message={info} /> : null}

        <CodeInput
          value={code}
          onChange={(v) => {
            setCode(v);
            if (v.length === 6) verify(v);
          }}
          error={Boolean(error)}
        />

        <Button title="Doğrula" onPress={() => verify()} loading={loading} disabled={code.length !== 6} />

        <Text variant="body" tone="secondary" align="center">
          Kod gelmedi mi?{' '}
          {cooldown > 0 ? (
            <Text variant="bodyStrong" tone="muted">
              {cooldown} sn sonra tekrar gönder
            </Text>
          ) : (
            <Text variant="bodyStrong" tone="primary" onPress={resend} accessibilityRole="link">
              Tekrar gönder
            </Text>
          )}
        </Text>

        <Button title="Daha sonra" variant="ghost" onPress={() => router.replace('/feed')} />
        <Text variant="caption" tone="muted" align="center">
          Doğrulamadan önce toplulukları okuyabilirsin; paylaşım ve mesaj için doğrulama gerekir.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg, paddingTop: spacing.lg },
  icon: {
    alignSelf: 'center',
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
