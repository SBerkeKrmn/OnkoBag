// 6 haneli doğrulama kodu girişi: görünür kutular + gizli tek TextInput
import { useRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Text } from './ui';
import { colors, radius, spacing } from '../constants/theme';

export default function CodeInput({ value, onChange, length = 6, error, autoFocus = true }) {
  const inputRef = useRef(null);
  const digits = value.split('');

  return (
    <Pressable onPress={() => inputRef.current?.focus()} accessibilityLabel="Doğrulama kodu" style={styles.row}>
      {Array.from({ length }).map((_, i) => {
        const active = i === Math.min(value.length, length - 1);
        return (
          <View
            key={i}
            style={[
              styles.box,
              digits[i] && styles.filled,
              active && styles.active,
              error && { borderColor: colors.danger },
            ]}
          >
            <Text variant="title">{digits[i] ?? ''}</Text>
          </View>
        );
      })}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={length}
        autoFocus={autoFocus}
        style={styles.hidden}
        caretHidden
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  box: {
    flex: 1,
    aspectRatio: 0.85,
    maxWidth: 56,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filled: { borderColor: colors.primaryMuted },
  active: { borderColor: colors.primary, borderWidth: 2 },
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
});
