import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from './Text';
import { colors, radius, spacing } from '../../constants/theme';

/**
 * Hastalık durumu rozeti.
 * - Tedavide: lavanta
 * - İyileşen: adaçayı yeşili; moderatör onaylıysa onay işaretiyle
 */
export default function StatusBadge({ status, isVerified, cancerTypeName, size = 'sm' }) {
  if (!status) return null;
  const survivor = status === 'SURVIVOR';
  const label = survivor ? 'İyileşen' : 'Tedavide';
  const fg = survivor ? colors.survivor : colors.primaryDark;
  const bg = survivor ? colors.survivorLight : colors.primaryLight;

  return (
    <View
      style={[styles.badge, { backgroundColor: bg }, size === 'md' && styles.md]}
      accessibilityLabel={`${cancerTypeName ? `${cancerTypeName}, ` : ''}${label}${survivor && isVerified ? ', doğrulanmış' : ''}`}
    >
      <Ionicons
        name={survivor ? (isVerified ? 'shield-checkmark' : 'leaf') : 'heart'}
        size={size === 'md' ? 14 : 12}
        color={fg}
      />
      <Text variant="tiny" style={{ color: fg }} numberOfLines={1}>
        {cancerTypeName ? `${label} · ${cancerTypeName}` : label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
    flexShrink: 1,
  },
  md: { paddingHorizontal: spacing.md, paddingVertical: 5 },
});
