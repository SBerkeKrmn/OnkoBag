import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from './Text';
import { colors, radius, spacing } from '../../constants/theme';

export default function Chip({ label, selected = false, onPress, icon, style }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.selected : styles.idle,
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={15} color={selected ? colors.textOnPrimary : colors.textSecondary} /> : null}
      <Text variant="label" style={{ color: selected ? colors.textOnPrimary : colors.textSecondary }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  idle: { backgroundColor: colors.surface, borderColor: colors.border },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
});
