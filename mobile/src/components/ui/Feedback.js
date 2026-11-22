// Durum gösterimleri: yükleniyor, hata, boş liste ve bilgi bandı
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from './Text';
import Button from './Button';
import { colors, radius, spacing } from '../../constants/theme';

export function LoadingView({ label }) {
  return (
    <View style={styles.center} accessibilityLabel={label ?? 'Yükleniyor'}>
      <ActivityIndicator size="large" color={colors.primary} />
      {label ? (
        <Text variant="caption" tone="muted" style={{ marginTop: spacing.md }}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

export function EmptyState({ icon = 'leaf-outline', title, message, actionLabel, onAction, compact = false }) {
  return (
    <View style={[styles.center, compact && { paddingVertical: spacing.xl, flex: 0 }]}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={30} color={colors.primary} />
      </View>
      <Text variant="subheading" align="center" style={{ marginTop: spacing.lg }}>
        {title}
      </Text>
      {message ? (
        <Text variant="body" tone="secondary" align="center" style={styles.message}>
          {message}
        </Text>
      ) : null}
      {actionLabel ? (
        <Button title={actionLabel} onPress={onAction} size="md" fullWidth={false} style={{ marginTop: spacing.xl, alignSelf: 'center' }} />
      ) : null}
    </View>
  );
}

export function ErrorView({ error, onRetry }) {
  return (
    <EmptyState
      icon="cloud-offline-outline"
      title="Bir sorun oluştu"
      message={error?.message ?? 'Bağlantınızı kontrol edip tekrar deneyin.'}
      actionLabel={onRetry ? 'Tekrar dene' : undefined}
      onAction={onRetry}
    />
  );
}

const BANNER_TONES = {
  info: { bg: colors.infoLight, fg: colors.info, icon: 'information-circle' },
  warning: { bg: colors.warningLight, fg: colors.warning, icon: 'alert-circle' },
  danger: { bg: colors.dangerLight, fg: colors.danger, icon: 'warning' },
  primary: { bg: colors.primaryLight, fg: colors.primaryDark, icon: 'sparkles' },
  survivor: { bg: colors.survivorLight, fg: colors.survivor, icon: 'leaf' },
};

export function Banner({ tone = 'info', title, message, icon, onPress, actionLabel }) {
  const t = BANNER_TONES[tone];
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={[styles.banner, { backgroundColor: t.bg }]}
    >
      <Ionicons name={icon ?? t.icon} size={20} color={t.fg} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, gap: 2 }}>
        {title ? (
          <Text variant="label" style={{ color: t.fg }}>
            {title}
          </Text>
        ) : null}
        {message ? (
          <Text variant="caption" tone="secondary">
            {message}
          </Text>
        ) : null}
        {actionLabel ? (
          <Text variant="label" style={{ color: t.fg, marginTop: 2 }}>
            {actionLabel} ›
          </Text>
        ) : null}
      </View>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: { marginTop: spacing.sm, maxWidth: 300 },
  banner: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
  },
});
