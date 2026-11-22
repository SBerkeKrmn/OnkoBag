import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './ui';
import { colors, radius, spacing } from '../constants/theme';

export function SettingsGroup({ title, children }) {
  return (
    <View style={{ gap: spacing.sm }}>
      {title ? (
        <Text variant="label" tone="muted" style={{ marginLeft: spacing.sm }}>
          {title.toLocaleUpperCase('tr-TR')}
        </Text>
      ) : null}
      <View style={styles.group}>{children}</View>
    </View>
  );
}

export default function SettingsRow({ icon, label, value, onPress, destructive = false, last = false, right }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, !last && styles.border, pressed && { backgroundColor: colors.surfaceMuted }]}
    >
      <View style={[styles.icon, destructive && { backgroundColor: colors.dangerLight }]}>
        <Ionicons name={icon} size={19} color={destructive ? colors.danger : colors.primary} />
      </View>
      <Text variant="bodyStrong" tone={destructive ? 'danger' : 'default'} style={{ flex: 1 }}>
        {label}
      </Text>
      {value ? (
        <Text variant="caption" tone="muted">
          {value}
        </Text>
      ) : null}
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56, paddingHorizontal: spacing.lg },
  border: { borderBottomWidth: 1, borderBottomColor: colors.border },
  icon: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
});
