// "Aktif tedavideyim" / "Kanseri atlattım" seçim kartları
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './ui';
import { colors, radius, spacing } from '../constants/theme';

const OPTIONS = [
  {
    value: 'ACTIVE_TREATMENT',
    title: 'Tedavi sürecindeyim',
    text: 'Deneyim paylaşmak ve destek almak istiyorum.',
    icon: 'heart',
    color: colors.primary,
    light: colors.primaryLight,
  },
  {
    value: 'SURVIVOR',
    title: 'Bu hastalığı atlattım',
    text: 'Yolun başındakilere umut olmak istiyorum.',
    icon: 'leaf',
    color: colors.survivor,
    light: colors.survivorLight,
  },
];

export default function StatusChoice({ value, onChange }) {
  return (
    <View style={styles.row}>
      {OPTIONS.map((o) => {
        const selected = value === o.value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            style={[styles.card, selected && { borderColor: o.color, backgroundColor: o.light }]}
          >
            <View style={[styles.icon, { backgroundColor: selected ? o.color : o.light }]}>
              <Ionicons name={o.icon} size={20} color={selected ? colors.textOnPrimary : o.color} />
            </View>
            <Text variant="bodyStrong">{o.title}</Text>
            <Text variant="caption" tone="secondary">
              {o.text}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  card: {
    flex: 1,
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
