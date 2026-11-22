import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import KeyboardAwareView from './KeyboardAwareView';
import { colors, spacing } from '../../constants/theme';

/**
 * Ekran kapsayıcısı: güvenli alan, klavye kaçınma ve isteğe bağlı kaydırma.
 * edges: hangi kenarlarda güvenli alan boşluğu uygulanacağı
 */
export default function Screen({
  children,
  scroll = false,
  padded = true,
  keyboard = false,
  edges = ['top', 'bottom'],
  background = colors.background,
  header,
  footer,
  contentStyle,
  refreshControl,
}) {
  const padding = padded ? styles.padded : null;

  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[padding, styles.scrollContent, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, padding, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: background }]} edges={edges}>
      {header}
      {keyboard ? (
        <KeyboardAwareView>
          {body}
          {footer}
        </KeyboardAwareView>
      ) : (
        <>
          {body}
          {footer}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  padded: { paddingHorizontal: spacing.xl },
  scrollContent: { paddingBottom: spacing.xxl, flexGrow: 1 },
});
