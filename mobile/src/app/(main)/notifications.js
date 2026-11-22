import { useEffect } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, Button, EmptyState, ErrorView, Header, LoadingView, Screen, Text } from '../../components/ui';
import { notificationsApi } from '../../api';
import { keys } from '../../lib/queryClient';
import { displayNameOf, timeAgo } from '../../lib/format';
import { colors, spacing } from '../../constants/theme';

const TEXTS = {
  NEW_FOLLOWER: (n) => `${displayNameOf(n.actor)} seni takip etmeye başladı.`,
  POST_LIKED: (n) => `${displayNameOf(n.actor)} gönderine destek verdi.`,
  POST_COMMENTED: (n) => `${displayNameOf(n.actor)} gönderine yorum yaptı.`,
  COMMENT_REPLIED: (n) => `${displayNameOf(n.actor)} yorumuna yanıt verdi.`,
  COMMENT_LIKED: (n) => `${displayNameOf(n.actor)} yorumunu beğendi.`,
};

const ICONS = {
  SURVIVOR_VERIFIED: { name: 'shield-checkmark', color: colors.survivor },
  REPORT_RESOLVED: { name: 'checkmark-circle', color: colors.info },
  SYSTEM: { name: 'information-circle', color: colors.warning },
};

function target(n) {
  if (n.type === 'NEW_FOLLOWER' && n.actor) return `/user/${n.actor.id}`;
  if (['POST_LIKED', 'POST_COMMENTED', 'COMMENT_REPLIED', 'COMMENT_LIKED'].includes(n.type) && n.entityId) return `/post/${n.entityId}`;
  if (n.type === 'SURVIVOR_VERIFIED') return '/profile';
  return null;
}

export default function NotificationsScreen() {
  const queryClient = useQueryClient();
  const list = useInfiniteQuery({
    queryKey: keys.notifications,
    queryFn: ({ pageParam }) => notificationsApi.list(pageParam),
    initialPageParam: undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const readAll = async () => {
    await notificationsApi.readAll().catch(() => {});
    queryClient.invalidateQueries({ queryKey: keys.notifications });
  };

  // Ekran açıldığında okunmamış sayacı sıfırlanır (bildirimler listede vurgulu kalır)
  useEffect(() => {
    const t = setTimeout(() => {
      notificationsApi.readAll().then(() => queryClient.invalidateQueries({ queryKey: keys.unreadCount })).catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [queryClient]);

  const items = list.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <Screen
      padded={false}
      edges={['top']}
      header={<Header back title="Bildirimler" right={<Button title="Tümünü oku" variant="ghost" size="sm" fullWidth={false} onPress={readAll} />} />}
    >
      {list.isLoading ? (
        <LoadingView />
      ) : list.error ? (
        <ErrorView error={list.error} onRetry={list.refetch} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ flexGrow: 1 }}
          onEndReached={() => list.hasNextPage && list.fetchNextPage()}
          refreshControl={<RefreshControl refreshing={list.isRefetching} onRefresh={list.refetch} tintColor={colors.primary} />}
          ListEmptyComponent={<EmptyState icon="notifications-outline" title="Bildirimin yok" message="Biri gönderine destek verdiğinde veya seni takip ettiğinde burada göreceksin." />}
          renderItem={({ item }) => {
            const href = target(item);
            const icon = ICONS[item.type];
            return (
              <Pressable
                onPress={() => {
                  if (!item.isRead) notificationsApi.read(item.id).catch(() => {});
                  if (href) router.push(href);
                }}
                accessibilityRole="button"
                style={({ pressed }) => [styles.item, !item.isRead && styles.unread, pressed && { opacity: 0.85 }]}
              >
                {icon ? (
                  <View style={[styles.iconCircle, { backgroundColor: `${icon.color}1A` }]}>
                    <Ionicons name={icon.name} size={22} color={icon.color} />
                  </View>
                ) : (
                  <Avatar user={item.actor} size={44} />
                )}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant={item.isRead ? 'body' : 'bodyStrong'}>{TEXTS[item.type]?.(item) ?? item.message}</Text>
                  <Text variant="tiny" tone="muted">
                    {timeAgo(item.createdAt)}
                  </Text>
                </View>
                {!item.isRead ? <View style={styles.dot} /> : null}
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  unread: { backgroundColor: colors.primaryLight },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary },
});
