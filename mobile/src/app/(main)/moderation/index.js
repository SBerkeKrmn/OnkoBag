// Moderasyon paneli ana ekranı: özet sayılar ve bölümler
import { RefreshControl, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Banner, ErrorView, Header, LoadingView, Screen, Text } from '../../../components/ui';
import SettingsRow, { SettingsGroup } from '../../../components/SettingsRow';
import { adminApi } from '../../../api';
import { useAuth } from '../../../context/AuthContext';
import { ROLE_LABELS } from '../../../lib/moderation';
import { useSocketEvent } from '../../../context/SocketContext';
import { colors, radius, spacing } from '../../../constants/theme';

function StatTile({ icon, value, label, tone = 'primary' }) {
  const color = tone === 'danger' ? colors.danger : tone === 'survivor' ? colors.survivor : colors.primary;
  return (
    <View style={styles.tile}>
      <Ionicons name={icon} size={20} color={color} />
      <Text variant="heading" style={{ color }}>
        {value ?? '–'}
      </Text>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  );
}

export default function ModerationHome() {
  const { user } = useAuth();
  const stats = useQuery({ queryKey: ['admin', 'stats'], queryFn: async () => (await adminApi.stats()).data });
  // Kendine zarar verme şikayeti gelince özet anında tazelenir
  useSocketEvent('moderation:urgent-report', () => stats.refetch());

  const s = stats.data;

  return (
    <Screen
      scroll
      header={<Header back title="Moderasyon" subtitle={ROLE_LABELS[user?.role]} />}
      refreshControl={<RefreshControl refreshing={stats.isRefetching} onRefresh={stats.refetch} tintColor={colors.primary} />}
    >
      {stats.isLoading ? (
        <LoadingView />
      ) : stats.error ? (
        <ErrorView error={stats.error} onRetry={stats.refetch} />
      ) : (
        <View style={styles.container}>
          {s.urgentReports > 0 ? (
            <Banner
              tone="danger"
              title={`${s.urgentReports} acil şikayet`}
              message="Kendine zarar verme riski bildirilen içerikleri öncelikle incele."
              actionLabel="Şikayetlere git"
              onPress={() => router.push('/moderation/reports')}
            />
          ) : null}

          <View style={styles.grid}>
            <StatTile icon="flag-outline" value={s.pendingReports} label="Bekleyen şikayet" tone={s.pendingReports ? 'danger' : 'primary'} />
            <StatTile icon="leaf-outline" value={s.survivorsPendingVerification} label="Onay bekleyen iyileşen" tone="survivor" />
            <StatTile icon="people-outline" value={s.users} label="Kullanıcı" />
            <StatTile icon="pulse-outline" value={s.activeUsers24h} label="Son 24 saatte aktif" />
            <StatTile icon="document-text-outline" value={s.posts24h} label="Gönderi (24 sa)" />
            <StatTile icon="chatbubbles-outline" value={s.roomMessages24h} label="Oda mesajı (24 sa)" />
          </View>

          <SettingsGroup title="İşlemler">
            <SettingsRow
              icon="flag-outline"
              label="Şikayetler"
              value={s.pendingReports ? `${s.pendingReports} bekleyen` : undefined}
              onPress={() => router.push('/moderation/reports')}
            />
            <SettingsRow
              icon="leaf-outline"
              label="İyileşen doğrulamaları"
              value={s.survivorsPendingVerification ? `${s.survivorsPendingVerification} bekleyen` : undefined}
              onPress={() => router.push('/moderation/survivors')}
            />
            <SettingsRow icon="people-outline" label="Kullanıcılar" onPress={() => router.push('/moderation/users')} />
            <SettingsRow icon="time-outline" label="İşlem kayıtları" onPress={() => router.push('/moderation/logs')} last />
          </SettingsGroup>

          <Text variant="tiny" tone="muted" align="center">
            Yapılan her işlem gerekçesiyle birlikte denetim kaydına yazılır.
          </Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xl, paddingTop: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    gap: 2,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
});
