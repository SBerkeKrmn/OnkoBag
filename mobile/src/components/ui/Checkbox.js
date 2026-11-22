import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from './Text';
import { colors, radius, spacing } from '../../constants/theme';

/** Onay kutusu. children ile bağlantı içeren zengin etiket verilebilir. */
export default function Checkbox({ checked, onToggle, label, children, error }) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={typeof label === 'string' ? label : undefined}
      style={styles.row}
    >
      <View
        style={[
          styles.box,
          checked && { backgroundColor: colors.primary, borderColor: colors.primary },
          error && !checked && { borderColor: colors.danger },
        ]}
      >
        {checked ? <Ionicons name="checkmark" size={16} color={colors.textOnPrimary} /> : null}
      </View>
      <View style={styles.label}>{children ?? <Text variant="body">{label}</Text>}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.xs },
  box: {
    width: 24,
    height: 24,
    borderRadius: radius.sm - 2,
    borderWidth: 2,
    borderColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    backgroundColor: colors.surface,
  },
  label: { flex: 1 },
});
