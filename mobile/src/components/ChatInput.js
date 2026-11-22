// Mesaj / yorum yazma çubuğu. Yanıtlanan öğe varsa üstünde gösterilir.
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './ui';
import { colors, fonts, fontSize, radius, spacing, hitSlop } from '../constants/theme';

export default function ChatInput({
  onSend,
  onAttach,
  onTyping,
  placeholder = 'Mesaj yaz…',
  replyTo,
  onCancelReply,
  maxLength = 2000,
  disabled = false,
  disabledText,
}) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    const ok = await onSend(value);
    setSending(false);
    if (ok !== false) setText('');
  };

  if (disabled) {
    return (
      <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Text variant="caption" tone="muted" align="center" style={{ flex: 1, paddingVertical: spacing.sm }}>
          {disabledText}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.outer, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {replyTo ? (
        <View style={styles.reply}>
          <View style={styles.replyBar} />
          <View style={{ flex: 1 }}>
            <Text variant="tiny" tone="primary">
              {replyTo.title}
            </Text>
            <Text variant="caption" tone="secondary" numberOfLines={1}>
              {replyTo.text}
            </Text>
          </View>
          <Pressable onPress={onCancelReply} hitSlop={hitSlop} accessibilityRole="button" accessibilityLabel="Yanıtı iptal et">
            <Ionicons name="close" size={20} color={colors.textMuted} />
          </Pressable>
        </View>
      ) : null}
      <View style={styles.container}>
        {onAttach ? (
          <Pressable onPress={onAttach} hitSlop={hitSlop} accessibilityRole="button" accessibilityLabel="Görsel gönder" style={styles.attach}>
            <Ionicons name="image-outline" size={24} color={colors.textSecondary} />
          </Pressable>
        ) : null}
        <TextInput
          value={text}
          onChangeText={(t) => {
            setText(t);
            onTyping?.();
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          multiline
          maxLength={maxLength}
          accessibilityLabel={placeholder}
        />
        <Pressable
          onPress={send}
          disabled={!text.trim() || sending}
          accessibilityRole="button"
          accessibilityLabel="Gönder"
          style={[styles.send, (!text.trim() || sending) && { backgroundColor: colors.primaryMuted }]}
        >
          {sending ? (
            <ActivityIndicator color={colors.textOnPrimary} size="small" />
          ) : (
            <Ionicons name="arrow-up" size={20} color={colors.textOnPrimary} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.surface,
  },
  attach: { height: 42, justifyContent: 'center', paddingHorizontal: 2 },
  input: {
    flex: 1,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
    minHeight: 42,
    maxHeight: 120,
    paddingHorizontal: spacing.lg,
    paddingTop: 11,
    paddingBottom: 11,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceMuted,
    fontFamily: fonts.medium,
    fontSize: fontSize.md,
    color: colors.text,
  },
  send: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reply: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
  },
  replyBar: { width: 3, alignSelf: 'stretch', borderRadius: 2, backgroundColor: colors.primary },
});
