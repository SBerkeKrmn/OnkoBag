import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Screen, Text } from '../../components/ui';
import Logo from '../../components/Logo';
import SocialButtons from '../../components/SocialButtons';
import { colors, radius, spacing } from '../../constants/theme';

const FEATURES = [
  {
    icon: 'chatbubbles-outline',
    title: 'Kanser türüne özel canlı odalar',
    text: 'Aynı tanıyı almış kişilerle anlık sohbet et.',
  },
  {
    icon: 'leaf-outline',
    title: 'İyileşenlerden umut ve deneyim',
    text: 'Bu yoldan geçmiş insanlarla doğrudan bağ kur.',
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Güvenli ve moderasyonlu',
    text: 'Takma adla katıl; şikayet ve engelleme her an elinde.',
  },
];

export default function WelcomeScreen() {
  return (
    <Screen scroll background={colors.background}>
      <View style={styles.decorA} />
      <View style={styles.decorB} />

      <View style={styles.hero}>
        <Logo size={64} tagline="Aynı yolu yürüyenlerle bağ kur." />
      </View>

      <View style={styles.features}>
        {FEATURES.map((f) => (
          <View key={f.title} style={styles.feature}>
            <View style={styles.featureIcon}>
              <Ionicons name={f.icon} size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{f.title}</Text>
              <Text variant="caption" tone="secondary">
                {f.text}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <SocialButtons divider />
        <Button title="E-posta ile hesap oluştur" onPress={() => router.push('/register')} />
        <Button title="Giriş yap" variant="outline" onPress={() => router.push('/login')} />
      </View>

      <Text variant="caption" tone="muted" align="center" style={styles.disclaimer}>
        Devam ederek{' '}
        <Text variant="caption" tone="primary" onPress={() => router.push('/legal/terms')} accessibilityRole="link">
          Kullanım Şartları
        </Text>
        ’nı ve{' '}
        <Text variant="caption" tone="primary" onPress={() => router.push('/legal/privacy')} accessibilityRole="link">
          Gizlilik Politikası
        </Text>
        ’nı okuduğunu kabul edersin. OnkoBağ tıbbi tavsiye vermez.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  decorA: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: colors.primaryLight,
  },
  decorB: {
    position: 'absolute',
    top: 120,
    left: -110,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.survivorLight,
    opacity: 0.7,
  },
  hero: { alignItems: 'center', paddingTop: spacing.xxxl + spacing.xl, paddingBottom: spacing.xxl },
  features: {
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  feature: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', paddingVertical: spacing.xs },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { gap: spacing.md, marginTop: 'auto', paddingTop: spacing.xxl },
  disclaimer: { marginTop: spacing.lg },
});
