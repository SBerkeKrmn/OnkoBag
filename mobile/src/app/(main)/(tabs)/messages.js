// Mesajlar sekmesi: birebir sohbet listesi
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Avatar, EmptyState, ErrorView, Header, IconButton, LoadingView, Screen, Text } from '../../../components/ui';
import { conversationsApi } from '../../../api';
import { keys } from '../../../lib/queryClient';
import { displayNameOf, timeAgo } from '../../../lib/format';
import { useAuth } from '../../../context/AuthContext';
import { colors, spacing } from '../../../constants/theme';

function ConversationItem({ conversation, myId }) {
  const last = conversation.lastMessage;
  const mine = last?.senderId === myId;
  let preview = 'Sohbet başladı';
  if (last) {
    const body = last.status !== 'PUBLISHED' ? 'Mesaj kaldırıldı' : (last.content ?? '📷 Görsel');
    preview = mine ? `Sen: ${body}` : body;
  }
  const unread = conversation.unreadCount > 0;

  return (
    <Pressable
      onPress={() => router.push(`/conversation/${conversation.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${displayNameOf(conversation.otherUser)} ile sohbet${unread ? `, ${conversation.unreadCount} okunmamış` : ''}`}
      style={({ pressed }) => [styles.item, pressed && { backgroundColor: colors.surfaceMuted }]}
    >
      <Avatar user={conversation.otherUser} size={52} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={styles.row}>
          <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
            {displayNameOf(conversation.otherUser)}
          </Text>
          {conversation.lastMessageAt ? (
            <Text variant="tiny" tone={unread ? 'primary' : 'muted'}>
              {timeAgo(conversation.lastMessageAt)}
            </Text>
          ) : null}
        </View>
        <View style={styles.row}>
          <Text variant={unread ? 'bodyStrong' : 'caption'} tone={unread ? 'default' : 'secondary'} numberOfLines={1} style={{ flex: 1 }}>
            {preview}
          </Text>
          {conversation.isMuted ? <Ionicons name="notifications-off-outline" size={14} color={colors.textMuted} /> : null}
          {unread ? (
            <View style={styles.badge}>
              <Text variant="tiny" tone="inverse">
                {conversation.unreadCount}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export default function MessagesScreen() {
  const { user } = useAuth();
  const list = useQuery({ queryKey: keys.conversations, queryFn: async () => (await conversationsApi.list()).data });

  return (
    <Screen
      padded={false}
      edges={['top']}
      header={<Header large title="Mesajlar" right={<IconButton icon="create-outline" label="Yeni mesaj" onPress={() => router.push('/search')} />} />}
    >
      {list.isLoading ? (
        <LoadingView />
      ) : list.error ? (
        <ErrorView error={list.error} onRetry={list.refetch} />
      ) : (
        <FlatList
          data={list.data}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <ConversationItem conversation={item} myId={user.id} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={{ flexGrow: 1 }}
          ListEmptyComponent={
            <EmptyState
              icon="mail-outline"
              title="Henüz mesajın yok"
              message="Gönderilerde veya sohbet odalarında tanıştığın kişilere profillerinden özel mesaj gönderebilirsin."
              actionLabel="Kişi ara"
              onAction={() => router.push('/search')}
            />
          }
          refreshControl={<RefreshControl refreshing={list.isRefetching} onRefresh={list.refetch} tintColor={colors.primary} />}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: { height: 1, backgroundColor: colors.border, marginLeft: 84 },
});
