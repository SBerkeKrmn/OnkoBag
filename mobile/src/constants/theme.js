// OnkoBağ tasarım sistemi: renkler, tipografi, boşluk ve gölgeler.
// Lavanta tüm kanser türlerinin ortak farkındalık rengidir; adaçayı yeşili
// iyileşenleri ve olumlu durumları temsil eder.

export const colors = {
  primary: '#6D5BD0',
  primaryDark: '#5443B8',
  primaryLight: '#EFEBFF',
  primaryMuted: '#B9AEF0',

  survivor: '#3E9C7A',
  survivorLight: '#E3F4EC',

  background: '#FAF9FD',
  surface: '#FFFFFF',
  surfaceMuted: '#F3F1F9',
  border: '#E6E2F0',

  text: '#1E1B2E',
  textSecondary: '#5E5A72',
  textMuted: '#8F8AA3',
  textOnPrimary: '#FFFFFF',

  danger: '#D4483F',
  dangerLight: '#FDECEA',
  warning: '#C98A14',
  warningLight: '#FDF4E2',
  info: '#2F6FD6',
  infoLight: '#E8F0FD',

  overlay: 'rgba(30, 27, 46, 0.45)',
};

export const fonts = {
  regular: 'Nunito_400Regular',
  medium: 'Nunito_500Medium',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extrabold: 'Nunito_800ExtraBold',
};

export const fontSize = {
  xs: 12,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
  display: 32,
};

export const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };

export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 };

export const shadow = {
  card: {
    shadowColor: '#2A1F66',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  raised: {
    shadowColor: '#2A1F66',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
};

/** Dokunma alanı en az 44pt (Apple HIG) / 48dp (Material) */
export const hitSlop = { top: 10, bottom: 10, left: 10, right: 10 };
