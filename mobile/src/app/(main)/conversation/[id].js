// Birebir özel sohbet
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ActionSheet, Avatar, EmptyState, ErrorView, Header, IconButton, LoadingView, Screen, Text } from '../../../components/ui';
import MessageList from '../../../components/MessageList';
import ChatInput from '../../../components/ChatInput';
import useChat, { useTypingEmitter, useTypingIndicator } from '../../../hooks/useChat';
import { useSocketEvent } from '../../../context/SocketContext';
import { conversationsApi } from '../../../api';
import { keys } from '../../../lib/queryClient';
import { displayNameOf } from '../../../lib/format';
import { confirmBlock, openReport } from '../../../lib/actions';
import { showError } from '../../../lib/errors';
import { pickAndUploadImage } from '../../../lib/pickImage';
import { useAuth } from '../../../context/AuthContext';
import { colors, spacing } from '../../../constants/theme';

export default function ConversationScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [seenId, setSeenId] = useState(null);

  const conversation = useQuery({
    queryKey: keys.conversation(id),
    queryFn: async () => (await conversationsApi.get(id)).data,
  });
  const chat = useChat('dm', id, user.id);
  const other = conversation.data?.otherUser;

  const typing = useTypingIndicator('dm:typing', (p) => p.conversationId === id);
  const typingPayload = useMemo(() => ({ conversationId: id }), [id]);
  const emitTyping = useTypingEmitter('dm:typing', typingPayload);

  useSocketEvent('dm:read', (p) => {
    if (p.conversationId === id && p.userId !== user.id) setSeenId(p.messageId);
  });
  const lastSeen = seenId ?? conversation.data?.otherLastReadMessageId;

  const send = async (content, mediaIds) => {
    try {
      await chat.send({ content, mediaIds });
      queryClient.invalidateQueries({ queryKey: keys.conversations });
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

  const hide = () =>
    Alert.alert('Sohbet silinsin mi?', 'Sohbet yalnızca senin listenden kaldırılır; karşı taraf mesajları görmeye devam eder.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await conversationsApi.hide(id).catch(showError);
          queryClient.invalidateQueries({ queryKey: keys.conversations });
          router.back();
        },
      },
    ]);

  const messageOptions = selected
    ? (selected.sender?.id ?? selected.senderId) === user.id
      ? [
          {
            label: 'Mesajı sil',
            icon: 'trash-outline',
            destructive: true,
            onPress: () => chat.remove(selected.id).catch(showError),
          },
        ]
      : [{ label: 'Mesajı şikayet et', icon: 'flag-outline', onPress: () => openReport('DIRECT_MESSAGE', selected.id) }]
    : [];

  const headerTitle = (
    <Pressable
      onPress={() => other && router.push(`/user/${other.id}`)}
      accessibilityRole="button"
      style={styles.headerUser}
    >
      <Avatar user={other} size={36} />
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {displayNameOf(other)}
        </Text>
        <Text variant="tiny" tone={typing ? 'primary' : 'muted'} numberOfLines={1}>
          {typing
            ? 'yazıyor…'
            : other?.primaryCancer
              ? `${other.primaryCancer.status === 'SURVIVOR' ? 'İyileşen' : 'Tedavide'} · ${other.primaryCancer.cancerType.name}`
              : ''}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <Screen
      padded={false}
      edges={['top']}
      header={
        <Header
          back
          titleComponent={headerTitle}
          right={<IconButton icon="ellipsis-vertical" label="Sohbet seçenekleri" onPress={() => setMenuOpen(true)} />}
        />
      }
    >
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flex: 1 }}>
          {chat.loading ? (
            <LoadingView />
          ) : chat.error ? (
            <ErrorView error={chat.error} onRetry={chat.reload} />
          ) : (
            <MessageList
              messages={chat.messages}
              myUserId={user.id}
              showNames={false}
              seenMessageId={lastSeen}
              onLongPress={setSelected}
              onEndReached={chat.loadOlder}
              loadingOlder={chat.loadingOlder}
              ListEmptyComponent={
                <View style={{ transform: [{ scaleY: -1 }], flex: 1 }}>
                  <EmptyState icon="hand-right-outline" title="İlk mesajı gönder" message="Kendini kısaca tanıtmak sohbeti kolaylaştırır." />
                </View>
              }
            />
          )}
        </View>
        <ChatInput
          onSend={(text) => send(text)}
          onAttach={sendImage}
          onTyping={emitTyping}
          maxLength={4000}
          disabled={!user.emailVerified || !other}
          disabledText={!other ? 'Bu kullanıcıya artık mesaj gönderilemez.' : 'Mesaj göndermek için e-posta adresini doğrulaman gerekiyor.'}
        />
      </KeyboardAvoidingView>

      <ActionSheet visible={Boolean(selected)} onClose={() => setSelected(null)} options={messageOptions} />
      <ActionSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        options={[
          ...(other
            ? [
                { label: 'Profili gör', icon: 'person-outline', onPress: () => router.push(`/user/${other.id}`) },
                { label: 'Kullanıcıyı şikayet et', icon: 'flag-outline', onPress: () => openReport('USER', other.id) },
                { label: 'Kullanıcıyı engelle', icon: 'ban-outline', destructive: true, onPress: () => confirmBlock(other, () => router.back()) },
              ]
            : []),
          { label: 'Sohbeti sil', icon: 'trash-outline', destructive: true, onPress: hide },
        ]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerUser: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
