import { Text as RNText, StyleSheet } from 'react-native';
import { colors, fonts, fontSize } from '../../constants/theme';

const variants = StyleSheet.create({
  display: { fontFamily: fonts.extrabold, fontSize: fontSize.display, lineHeight: 38, letterSpacing: -0.5 },
  title: { fontFamily: fonts.extrabold, fontSize: fontSize.xxl, lineHeight: 32, letterSpacing: -0.3 },
  heading: { fontFamily: fonts.bold, fontSize: fontSize.xl, lineHeight: 26 },
  subheading: { fontFamily: fonts.bold, fontSize: fontSize.lg, lineHeight: 23 },
  body: { fontFamily: fonts.regular, fontSize: fontSize.md, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: fontSize.md, lineHeight: 22 },
  label: { fontFamily: fonts.bold, fontSize: fontSize.sm, lineHeight: 18 },
  caption: { fontFamily: fonts.medium, fontSize: fontSize.sm, lineHeight: 18 },
  tiny: { fontFamily: fonts.semibold, fontSize: fontSize.xs, lineHeight: 16 },
});

const tones = {
  default: colors.text,
  secondary: colors.textSecondary,
  muted: colors.textMuted,
  primary: colors.primary,
  survivor: colors.survivor,
  danger: colors.danger,
  inverse: colors.textOnPrimary,
};

/** Uygulamanın tek metin bileşeni: tipografi tutarlılığı için RN Text yerine bu kullanılır */
export default function Text({ variant = 'body', tone = 'default', align, style, ...props }) {
  return (
    <RNText
      maxFontSizeMultiplier={1.4}
      style={[variants[variant], { color: tones[tone] ?? tone }, align && { textAlign: align }, style]}
      {...props}
    />
  );
}
