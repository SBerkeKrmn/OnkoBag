// Ters sıralı mesaj listesi: gün ayırıcıları, ardışık mesaj gruplama,
// yanıt alıntısı, görseller, silinmiş/gizlenmiş mesaj gösterimi.
import { useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Avatar, Text } from './ui';
import ImageViewer from './ImageViewer';
import { clockTime, dayLabel, displayNameOf, sameDay } from '../lib/format';
import { colors, radius, spacing } from '../constants/theme';

const GROUP_WINDOW = 5 * 60 * 1000;

function senderIdOf(m) {
  return m.sender?.id ?? m.senderId ?? null;
}

function Bubble({ message, mine, showSender, showAvatar, onLongPress, onOpenImage, seen, showNames }) {
  const removed = message.status !== 'PUBLISHED';

  if (message.type === 'SYSTEM') {
    return (
      <Text variant="tiny" tone="muted" align="center" style={{ marginVertical: spacing.sm }}>
        {message.content}
      </Text>
    );
  }

  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowOther, !showSender && { marginTop: 2 }]}>
      {!mine && showNames ? (
        <View style={styles.avatarSlot}>
          {showAvatar ? (
            <Pressable onPress={() => message.sender && router.push(`/user/${message.sender.id}`)} accessibilityRole="button">
              <Avatar user={message.sender} size={32} ring={false} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={{ maxWidth: '78%', alignItems: mine ? 'flex-end' : 'flex-start' }}>
        {!mine && showNames && showSender ? (
          <View style={styles.senderRow}>
            <Text variant="tiny" tone="secondary">
              {displayNameOf(message.sender)}
            </Text>
            {message.sender?.primaryCancer ? (
              <View
                style={[
                  styles.dot,
                  { backgroundColor: message.sender.primaryCancer.status === 'SURVIVOR' ? colors.survivor : colors.primaryMuted },
                ]}
              />
            ) : null}
            {message.sender?.primaryCancer?.status === 'SURVIVOR' ? (
              <Text variant="tiny" tone="survivor">
                İyileşen
              </Text>
            ) : null}
          </View>
        ) : null}

        <Pressable
          onLongPress={() => !removed && onLongPress?.(message)}
          delayLongPress={300}
          accessibilityHint="Seçenekler için basılı tut"
          style={[styles.bubble, mine ? styles.mine : styles.other, removed && styles.removed]}
        >
          {message.replyTo && !removed ? (
            <View style={[styles.quote, mine && { backgroundColor: 'rgba(255,255,255,0.18)', borderLeftColor: '#fff' }]}>
              <Text variant="tiny" style={{ color: mine ? '#fff' : colors.primary }}>
                {displayNameOf(message.replyTo.sender)}
              </Text>
              <Text variant="caption" numberOfLines={2} style={{ color: mine ? 'rgba(255,255,255,0.85)' : colors.textSecondary }}>
                {message.replyTo.content ?? 'Bu mesaj kaldırıldı'}
              </Text>
            </View>
          ) : null}

          {removed ? (
            <Text variant="caption" tone="muted" style={{ fontStyle: 'italic' }}>
              {message.status === 'HIDDEN' ? 'Bu mesaj moderatör tarafından gizlendi' : 'Bu mesaj silindi'}
            </Text>
          ) : (
            <>
              {message.media?.map((m, i) => (
                <Pressable
                  key={m.id}
                  onPress={() => onOpenImage?.(message.media, i)}
                  onLongPress={() => onLongPress?.(message)}
                  delayLongPress={300}
                  accessibilityRole="imagebutton"
                  accessibilityLabel="Görseli tam ekran aç"
                  style={styles.image}
                >
                  <Image source={{ uri: m.url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                </Pressable>
              ))}
              {message.content ? (
                <Text variant="body" style={{ color: mine ? colors.textOnPrimary : colors.text }}>
                  {message.content}
                </Text>
              ) : null}
            </>
          )}

          <Text variant="tiny" style={[styles.time, { color: mine ? 'rgba(255,255,255,0.75)' : colors.textMuted }]}>
            {message.editedAt ? 'düzenlendi · ' : ''}
            {clockTime(message.createdAt)}
          </Text>
        </Pressable>
        {seen ? (
          <Text variant="tiny" tone="muted" style={{ marginTop: 2 }}>
            Görüldü
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/**
 * messages: en yeniden en eskiye
 * showNames: oda sohbetlerinde gönderen adı/avatarı gösterilir (DM'de gerekmez)
 * seenMessageId: DM'de karşı tarafın okuduğu son mesaj (benim son mesajıma "Görüldü")
 */
export default function MessageList({
  messages,
  myUserId,
  onLongPress,
  onEndReached,
  loadingOlder,
  showNames = true,
  seenMessageId,
  ListEmptyComponent,
}) {
  const myLatest = messages.find((m) => senderIdOf(m) === myUserId);
  const seenId =
    seenMessageId && myLatest && BigInt(seenMessageId) >= BigInt(myLatest.id) ? String(myLatest.id) : null;
  const [viewer, setViewer] = useState(null); // { images, index }

  return (
    <>
    <ImageViewer
      images={viewer?.images}
      index={viewer?.index ?? 0}
      visible={Boolean(viewer)}
      onClose={() => setViewer(null)}
    />
    <FlatList
      inverted
      data={messages}
      keyExtractor={(m) => String(m.id)}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      onEndReached={onEndReached}
      onEndReachedThreshold={0.3}
      ListFooterComponent={loadingOlder ? <ActivityIndicator color={colors.primary} style={{ margin: spacing.lg }} /> : null}
      ListEmptyComponent={ListEmptyComponent}
      renderItem={({ item, index }) => {
        const older = messages[index + 1];
        const newer = messages[index - 1];
        const mine = senderIdOf(item) === myUserId;
        const newDay = !older || !sameDay(older.createdAt, item.createdAt);
        const groupedWithOlder =
          older &&
          !newDay &&
          senderIdOf(older) === senderIdOf(item) &&
          new Date(item.createdAt) - new Date(older.createdAt) < GROUP_WINDOW;
        const groupedWithNewer =
          newer &&
          sameDay(newer.createdAt, item.createdAt) &&
          senderIdOf(newer) === senderIdOf(item) &&
          new Date(newer.createdAt) - new Date(item.createdAt) < GROUP_WINDOW;

        return (
          <View>
            {newDay ? (
              <View style={styles.day}>
                <Text variant="tiny" tone="muted">
                  {dayLabel(item.createdAt)}
                </Text>
              </View>
            ) : null}
            <Bubble
              message={item}
              mine={mine}
              showNames={showNames}
              showSender={!groupedWithOlder}
              showAvatar={!groupedWithNewer}
              onLongPress={onLongPress}
              onOpenImage={(images, index) => setViewer({ images, index })}
              seen={seenId === String(item.id)}
            />
          </View>
        );
      }}
    />
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, flexGrow: 1 },
  day: {
    alignSelf: 'center',
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginVertical: spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'flex-end', marginTop: spacing.sm, gap: spacing.sm },
  rowMine: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },
  avatarSlot: { width: 32 },
  senderRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: spacing.sm, marginBottom: 3 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  bubble: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.lg, gap: 4 },
  mine: { backgroundColor: colors.primary, borderBottomRightRadius: 6 },
  other: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 6 },
  removed: { backgroundColor: colors.surfaceMuted, borderColor: colors.surfaceMuted },
  quote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  image: { width: 220, height: 220, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surfaceMuted },
  time: { alignSelf: 'flex-end', fontSize: 10, lineHeight: 13 },
});
