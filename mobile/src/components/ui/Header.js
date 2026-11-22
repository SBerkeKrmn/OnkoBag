import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Text from './Text';
import { colors, spacing, hitSlop } from '../../constants/theme';

export function IconButton({ icon, onPress, label, color = colors.text, size = 24, badge, style }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.iconButton, pressed && { backgroundColor: colors.surfaceMuted }, style]}
    >
      <Ionicons name={icon} size={size} color={color} />
      {badge ? (
        <View style={styles.badge}>
          <Text variant="tiny" tone="inverse" style={styles.badgeText}>
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * Ekran başlığı. back=true ise geri düğmesi gösterilir.
 * large=true sekmelerin ana başlıkları içindir.
 */
export default function Header({ title, subtitle, back = false, onBack, right, large = false, left, titleComponent }) {
  return (
    <View style={[styles.container, large && styles.large]}>
      {large && !back && !left ? null : (
        <View style={[styles.side, large && styles.sideLarge]}>
          {back ? <IconButton icon="chevron-back" label="Geri" onPress={onBack ?? (() => router.back())} /> : left}
        </View>
      )}

      <View style={styles.titleWrap}>
        {titleComponent ?? (
          <Text variant={large ? 'title' : 'subheading'} numberOfLines={1} align={large ? 'left' : 'center'}>
            {title}
          </Text>
        )}
        {subtitle ? (
          <Text variant="caption" tone="muted" numberOfLines={1} align={large ? 'left' : 'center'}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={[styles.side, styles.right]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    minHeight: 56,
    gap: spacing.xs,
  },
  large: { paddingHorizontal: spacing.xl, minHeight: 64 },
  side: { minWidth: 44, flexDirection: 'row', alignItems: 'center' },
  right: { justifyContent: 'flex-end', gap: spacing.xs },
  sideLarge: { minWidth: 0, marginRight: spacing.sm },
  titleWrap: { flex: 1 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  badgeText: { fontSize: 10, lineHeight: 12 },
});
