import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, shadow, spacing } from '../../constants/theme';

export default function Card({ children, onPress, style, padded = true, accessibilityLabel }) {
  const content = [styles.card, padded && styles.padded, style];
  if (!onPress) return <View style={content}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [...content, pressed && { opacity: 0.92 }]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  padded: { padding: spacing.lg },
});
