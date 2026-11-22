import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from './Text';
import { colors, radius, spacing } from '../../constants/theme';

const VARIANTS = {
  primary: { bg: colors.primary, pressed: colors.primaryDark, fg: colors.textOnPrimary, border: colors.primary },
  secondary: { bg: colors.primaryLight, pressed: '#E2DBFF', fg: colors.primaryDark, border: colors.primaryLight },
  outline: { bg: colors.surface, pressed: colors.surfaceMuted, fg: colors.text, border: colors.border },
  ghost: { bg: 'transparent', pressed: colors.surfaceMuted, fg: colors.primary, border: 'transparent' },
  danger: { bg: colors.dangerLight, pressed: '#F9D9D6', fg: colors.danger, border: colors.dangerLight },
  survivor: { bg: colors.survivor, pressed: '#34876A', fg: colors.textOnPrimary, border: colors.survivor },
};

const SIZES = {
  lg: { height: 54, paddingHorizontal: spacing.xl, iconSize: 20 },
  md: { height: 46, paddingHorizontal: spacing.lg, iconSize: 18 },
  sm: { height: 36, paddingHorizontal: spacing.md, iconSize: 16 },
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon,
  iconRight,
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
  accessibilityLabel,
}) {
  const v = VARIANTS[variant];
  const s = SIZES[size];
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        {
          height: s.height,
          paddingHorizontal: s.paddingHorizontal,
          backgroundColor: pressed ? v.pressed : v.bg,
          borderColor: v.border,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <View style={styles.content}>
          {icon ? <Ionicons name={icon} size={s.iconSize} color={v.fg} /> : null}
          <Text variant={size === 'sm' ? 'label' : 'bodyStrong'} style={{ color: v.fg }}>
            {title}
          </Text>
          {iconRight ? <Ionicons name={iconRight} size={s.iconSize} color={v.fg} /> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
