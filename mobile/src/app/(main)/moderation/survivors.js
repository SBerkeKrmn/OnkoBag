// İyileşen rozeti onayı: iyileştiğini belirten kullanıcıların listesi
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, EmptyState, ErrorView, Header, LoadingView, Screen, Text } from '../../../components/ui';
import UserLine from '../../../components/UserLine';
import { adminApi } from '../../../api';
import { confirmAction } from '../../../lib/actions';
import { showError } from '../../../lib/errors';
import { timeAgo } from '../../../lib/format';
import { colors, radius, spacing } from '../../../constants/theme';

export default function SurvivorsScreen() {
  const queryClient = useQueryClient();
  const list = useQuery({
    queryKey: ['admin', 'survivors'],
    queryFn: async () => (await adminApi.pendingSurvivors()).data,
  });

  const verify = (item) =>
    confirmAction({
      title: 'İyileşen rozeti onaylansın mı?',
      message: `@${item.user.username} profilinde "${item.cancerType.name}" için doğrulanmış iyileşen rozeti görünecek.`,
      confirmText: 'Onayla',
      onConfirm: async () => {
        try {
          await adminApi.verifySurvivor(item.id);
          queryClient.invalidateQueries({ queryKey: ['admin'] });
        } catch (err) {
          showError(err);
        }
      },
    });

  let empty;
  if (list.isLoading) empty = <LoadingView />;
  else if (list.error) empty = <ErrorView error={list.error} onRetry={list.refetch} />;
  else empty = <EmptyState compact icon="leaf-outline" title="Onay bekleyen yok" message="Yeni iyileşen profilleri burada görünür." />;

  return (
    <Screen padded={false} header={<Header back title="İyileşen doğrulamaları" />}>
      <FlatList
        data={list.data ?? []}
        keyExtractor={(p) => p.id}
        ListHeaderComponent={
          <Text variant="caption" tone="muted" style={styles.intro}>
            Rozet, kişinin iyileşme deneyimini paylaştığını gösterir. Onaylamadan önce profilini ve paylaşımlarını incele;
            sağlık belgesi istenmez.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <UserLine user={item.user} meta={`Kayıt: ${timeAgo(item.user.createdAt)}`} onPress={() => router.push(`/user/${item.user.id}`)} />
            <Text variant="bodyStrong">{item.cancerType.name}</Text>
            <Text variant="caption" tone="secondary">
              {[item.diagnosisYear && `Tanı: ${item.diagnosisYear}`, item.remissionYear && `İyileşme: ${item.remissionYear}`]
                .filter(Boolean)
                .join(' · ') || 'Yıl bilgisi girilmemiş'}
            </Text>
            {item.user.bio ? (
              <Text variant="body" tone="secondary" numberOfLines={3}>
                {item.user.bio}
              </Text>
            ) : null}
            <View style={styles.buttons}>
              <Button title="Profili incele" variant="outline" size="sm" style={{ flex: 1 }} onPress={() => router.push(`/user/${item.user.id}`)} />
              <Button title="Onayla" icon="checkmark" variant="survivor" size="sm" style={{ flex: 1 }} onPress={() => verify(item)} />
            </View>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListEmptyComponent={empty}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        refreshControl={<RefreshControl refreshing={list.isRefetching} onRefresh={list.refetch} tintColor={colors.primary} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  card: {
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  buttons: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
});
