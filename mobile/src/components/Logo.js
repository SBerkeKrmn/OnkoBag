// OnkoBağ logosu: iç içe geçen iki halka — tedavideki ve iyileşen iki insanın
// "bağ"ını simgeler (lavanta + adaçayı).
import { StyleSheet, View } from 'react-native';
import { Text } from './ui';
import { colors } from '../constants/theme';

export function LogoMark({ size = 56 }) {
  const ring = size * 0.62;
  const stroke = Math.max(3, size * 0.1);
  return (
    <View style={{ width: size, height: size * 0.72 }} accessibilityElementsHidden importantForAccessibility="no">
      <View
        style={[
          styles.ring,
          { width: ring, height: ring, borderRadius: ring / 2, borderWidth: stroke, borderColor: colors.primary, left: 0, top: (size * 0.72 - ring) / 2 },
        ]}
      />
      <View
        style={[
          styles.ring,
          { width: ring, height: ring, borderRadius: ring / 2, borderWidth: stroke, borderColor: colors.survivor, right: 0, top: (size * 0.72 - ring) / 2 },
        ]}
      />
    </View>
  );
}

export default function Logo({ size = 56, showText = true, tagline }) {
  return (
    <View style={styles.container} accessibilityRole="header" accessibilityLabel="OnkoBağ">
      <LogoMark size={size} />
      {showText ? (
        <Text variant="display" style={{ fontSize: size * 0.6, lineHeight: size * 0.72, marginTop: 8 }}>
          Onko<Text variant="display" tone="primary" style={{ fontSize: size * 0.6, lineHeight: size * 0.72 }}>Bağ</Text>
        </Text>
      ) : null}
      {tagline ? (
        <Text variant="body" tone="secondary" align="center" style={{ marginTop: 4 }}>
          {tagline}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  ring: { position: 'absolute' },
});
