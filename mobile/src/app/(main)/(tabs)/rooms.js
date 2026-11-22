// Odalar sekmesi: kullanıcının üye olduğu kanser türü sohbet odaları
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Banner, EmptyState, ErrorView, Header, LoadingView, Screen, Text } from '../../../components/ui';
import { roomsApi } from '../../../api';
import { keys } from '../../../lib/queryClient';
import { displayNameOf, timeAgo } from '../../../lib/format';
import { colors, radius, spacing } from '../../../constants/theme';

function RoomItem({ room }) {
  const last = room.lastMessage;
  const preview = last
    ? `${displayNameOf(last.sender)}: ${last.content ?? (last.media?.length ? '📷 Görsel' : '')}`
    : 'Henüz mesaj yok. İlk merhabayı sen de!';

  return (
    <Pressable
      onPress={() => router.push(`/room/${room.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${room.name}, ${room.unreadCount} okunmamış mesaj`}
      style={({ pressed }) => [styles.item, pressed && { backgroundColor: colors.surfaceMuted }]}
    >
      <View style={styles.icon}>
        <Ionicons name="chatbubbles" size={24} color={colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={styles.titleRow}>
          <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
            {room.name}
          </Text>
          {last ? (
            <Text variant="tiny" tone={room.unreadCount ? 'primary' : 'muted'}>
              {timeAgo(last.createdAt)}
            </Text>
          ) : null}
        </View>
        <View style={styles.titleRow}>
          <Text variant="caption" tone="secondary" numberOfLines={1} style={{ flex: 1 }}>
            {preview}
          </Text>
          {room.isMuted ? <Ionicons name="notifications-off-outline" size={14} color={colors.textMuted} /> : null}
          {room.unreadCount > 0 ? (
            <View style={[styles.unread, room.isMuted && { backgroundColor: colors.textMuted }]}>
              <Text variant="tiny" tone="inverse">
                {room.unreadCount > 99 ? '99+' : room.unreadCount}
              </Text>
            </View>
          ) : null}
        </View>
        <Text variant="tiny" tone="muted">
          {room.memberCount} üye
        </Text>
      </View>
    </Pressable>
  );
}

export default function RoomsScreen() {
  const rooms = useQuery({ queryKey: keys.rooms, queryFn: async () => (await roomsApi.mine()).data });

  return (
    <Screen padded={false} edges={['top']} header={<Header large title="Sohbet odaları" />}>
      {rooms.isLoading ? (
        <LoadingView />
      ) : rooms.error ? (
        <ErrorView error={rooms.error} onRetry={rooms.refetch} />
      ) : (
        <FlatList
          data={rooms.data}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => <RoomItem room={item} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={
            <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
              <Banner
                tone="primary"
                icon="people-outline"
                message="Profilindeki her kanser türü için o türün canlı sohbet odasına otomatik olarak katılırsın. Odalar kalabalıklaştıkça yeni odalar açılır."
              />
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              icon="chatbubbles-outline"
              title="Henüz bir odada değilsin"
              message="Profiline bir kanser türü ekleyerek ilgili sohbet odasına katılabilirsin."
              actionLabel="Kanser profillerim"
              onAction={() => router.push('/settings/cancer-profiles')}
            />
          }
          refreshControl={<RefreshControl refreshing={rooms.isRefetching} onRefresh={rooms.refetch} tintColor={colors.primary} />}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, alignItems: 'center' },
  icon: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  unread: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: { height: 1, backgroundColor: colors.border, marginLeft: 84 },
});
