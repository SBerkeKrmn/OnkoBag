// Genel sohbet odası
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ActionSheet, EmptyState, ErrorView, Header, IconButton, KeyboardAwareView, LoadingView, Screen, Text } from '../../../../components/ui';
import MessageList from '../../../../components/MessageList';
import ChatInput from '../../../../components/ChatInput';
import useChat, { useTypingEmitter, useTypingIndicator } from '../../../../hooks/useChat';
import { conversationsApi, roomsApi } from '../../../../api';
import { keys } from '../../../../lib/queryClient';
import { displayNameOf } from '../../../../lib/format';
import { confirmBlock, openReport } from '../../../../lib/actions';
import { showError } from '../../../../lib/errors';
import { pickAndUploadImage } from '../../../../lib/pickImage';
import { useAuth } from '../../../../context/AuthContext';
import { colors, spacing } from '../../../../constants/theme';

export default function RoomScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [replyTo, setReplyTo] = useState(null);
  const [selected, setSelected] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const room = useQuery({ queryKey: keys.room(id), queryFn: async () => (await roomsApi.get(id)).data });
  const chat = useChat('room', id, user.id);
  const typing = useTypingIndicator('room:typing', (p) => p.roomId === id && p.user?.id !== user.id);
  const typingPayload = useMemo(() => ({ roomId: id }), [id]);
  const emitTyping = useTypingEmitter('room:typing', typingPayload);

  const silenced = room.data?.silencedUntil && new Date(room.data.silencedUntil) > new Date();

  const send = async (content, mediaIds) => {
    try {
      await chat.send({ content, replyToId: replyTo?.id, mediaIds });
      setReplyTo(null);
      queryClient.invalidateQueries({ queryKey: keys.rooms });
      return true;
    } catch (err) {
      showError(err, 'Mesaj gönderilemedi');
      return false;
    }
  };

  const sendImage = async () => {
    try {
      const media = await pickAndUploadImage();
      if (media) await send(undefined, [media.id]);
    } catch (err) {
      showError(err, 'Görsel gönderilemedi');
    }
  };

  const toggleMute = async () => {
    try {
      await roomsApi.mute(id, !room.data.isMuted);
      room.refetch();
      queryClient.invalidateQueries({ queryKey: keys.rooms });
    } catch (err) {
      showError(err);
    }
  };

  const startDm = async (target) => {
    try {
      const { data } = await conversationsApi.start(target.id);
      router.push(`/conversation/${data.id}`);
    } catch (err) {
      showError(err, 'Sohbet başlatılamadı');
    }
  };

  const messageOptions = (() => {
    if (!selected) return [];
    const mine = selected.sender?.id === user.id;
    const opts = [
      {
        label: 'Yanıtla',
        icon: 'arrow-undo-outline',
        onPress: () =>
          setReplyTo({ id: selected.id, title: `${displayNameOf(selected.sender)} kişisine yanıt`, text: selected.content ?? '📷 Görsel' }),
      },
    ];
    if (mine) {
      opts.push({
        label: 'Mesajı sil',
        icon: 'trash-outline',
        destructive: true,
        onPress: () =>
          Alert.alert('Mesaj silinsin mi?', 'Mesaj herkes için silinir.', [
            { text: 'Vazgeç', style: 'cancel' },
            { text: 'Sil', style: 'destructive', onPress: () => chat.remove(selected.id).catch(showError) },
          ]),
      });
    } else if (selected.sender) {
      opts.push(
        { label: 'Özel mesaj gönder', icon: 'mail-outline', onPress: () => startDm(selected.sender) },
        { label: 'Profili gör', icon: 'person-outline', onPress: () => router.push(`/user/${selected.sender.id}`) },
        { label: 'Mesajı şikayet et', icon: 'flag-outline', onPress: () => openReport('ROOM_MESSAGE', selected.id) },
        { label: 'Kullanıcıyı engelle', icon: 'ban-outline', destructive: true, onPress: () => confirmBlock(selected.sender, chat.reload) },
      );
    }
    return opts;
  })();

  const subtitle = typing
    ? `${typing.user.username} yazıyor…`
    : room.data
      ? `${room.data.memberCount} üye · ${room.data.members.activeTreatment} tedavide · ${room.data.members.survivors} iyileşen`
      : undefined;

  return (
    <Screen
      padded={false}
      edges={['top']}
      header={
        <Header
          back
          title={room.data?.name ?? 'Sohbet odası'}
          subtitle={subtitle}
          right={<IconButton icon="ellipsis-vertical" label="Oda seçenekleri" onPress={() => setMenuOpen(true)} />}
        />
      }
    >
      <KeyboardAwareView>
        <View style={styles.body}>
          {chat.loading ? (
            <LoadingView />
          ) : chat.error ? (
            <ErrorView error={chat.error} onRetry={chat.reload} />
          ) : (
            <MessageList
              messages={chat.messages}
              myUserId={user.id}
              onLongPress={setSelected}
              onEndReached={chat.loadOlder}
              loadingOlder={chat.loadingOlder}
              ListEmptyComponent={
                <View style={{ transform: [{ scaleY: -1 }], flex: 1 }}>
                  <EmptyState icon="hand-left-outline" title="Sohbeti başlat" message="Kendini tanıt, nasıl hissettiğini paylaş. Burada herkes benzer bir yoldan geçiyor." />
                </View>
              }
            />
          )}
        </View>
        <Text variant="tiny" tone="muted" align="center" style={styles.notice}>
          Paylaşımlar tıbbi tavsiye değildir · Uygunsuz mesajları basılı tutarak şikayet edebilirsin
        </Text>
        <ChatInput
          onSend={(text) => send(text)}
          onAttach={sendImage}
          onTyping={emitTyping}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          disabled={!user.emailVerified || silenced}
          disabledText={
            silenced
              ? 'Bu odada geçici olarak mesaj gönderemezsin.'
              : 'Mesaj göndermek için e-posta adresini doğrulaman gerekiyor.'
          }
        />
      </KeyboardAwareView>

      <ActionSheet visible={Boolean(selected)} onClose={() => setSelected(null)} options={messageOptions} />
      <ActionSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={room.data?.name}
        options={[
          { label: 'Üyeleri gör', icon: 'people-outline', onPress: () => router.push(`/room/${id}/members`) },
          {
            label: room.data?.isMuted ? 'Bildirimleri aç' : 'Sessize al',
            icon: room.data?.isMuted ? 'notifications-outline' : 'notifications-off-outline',
            onPress: toggleMute,
          },
          { label: 'Topluluk kuralları', icon: 'document-text-outline', onPress: () => router.push('/legal/community') },
        ]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, backgroundColor: colors.background },
  notice: { paddingHorizontal: spacing.lg, paddingVertical: 4, backgroundColor: colors.background },
});
