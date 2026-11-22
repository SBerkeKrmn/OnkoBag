// Denetim kayıtları: kim, ne zaman, hangi işlemi, hangi gerekçeyle yaptı
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { EmptyState, ErrorView, Header, LoadingView, Screen, Text } from '../../../components/ui';
import { adminApi } from '../../../api';
import { timeAgo } from '../../../lib/format';
import { ACTION_LABELS, TARGET_TYPES } from '../../../lib/moderation';
import { colors, spacing } from '../../../constants/theme';

export default function LogsScreen() {
  const logs = useInfiniteQuery({
    queryKey: ['admin', 'logs'],
    queryFn: ({ pageParam }) => adminApi.logs(pageParam),
    initialPageParam: undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const items = logs.data?.pages.flatMap((p) => p.data) ?? [];

  let empty;
  if (logs.isLoading) empty = <LoadingView />;
  else if (logs.error) empty = <ErrorView error={logs.error} onRetry={logs.refetch} />;
  else empty = <EmptyState compact icon="time-outline" title="Henüz işlem yapılmadı" />;

  return (
    <Screen padded={false} header={<Header back title="İşlem kayıtları" />}>
      <FlatList
        data={items}
        keyExtractor={(l) => String(l.id)}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="bodyStrong">{ACTION_LABELS[item.action] ?? item.action}</Text>
              <Text variant="caption" tone="secondary">
                @{item.moderator?.username ?? 'silinmiş'}
                {item.targetUser ? ` → @${item.targetUser.username}` : ''}
                {item.targetType ? ` · ${TARGET_TYPES[item.targetType]?.label ?? item.targetType}` : ''}
              </Text>
              {item.reason ? (
                <Text variant="caption" tone="muted">
                  “{item.reason}”
                </Text>
              ) : null}
            </View>
            <Text variant="tiny" tone="muted">
              {timeAgo(item.createdAt)}
            </Text>
          </View>
        )}
        ListEmptyComponent={empty}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        onEndReached={() => logs.hasNextPage && !logs.isFetchingNextPage && logs.fetchNextPage()}
        refreshControl={<RefreshControl refreshing={logs.isRefetching} onRefresh={logs.refetch} tintColor={colors.primary} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
