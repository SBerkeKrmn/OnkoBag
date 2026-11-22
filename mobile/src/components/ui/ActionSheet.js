// Alttan açılan seçenek menüsü (mesaj/gönderi/profil işlemleri için)
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Text from './Text';
import { colors, radius, spacing } from '../../constants/theme';

/**
 * options: [{ label, icon, destructive?, onPress }]
 */
export default function ActionSheet({ visible, onClose, title, options = [] }) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Menüyü kapat" />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <View style={styles.handle} />
        {title ? (
          <Text variant="label" tone="muted" align="center" style={styles.title}>
            {title}
          </Text>
        ) : null}
        {options.map((opt) => (
          <Pressable
            key={opt.label}
            accessibilityRole="button"
            onPress={() => {
              onClose();
              // Modal kapanma animasyonu bitmeden yeni ekran/uyarı açılmasın
              setTimeout(opt.onPress, 250);
            }}
            style={({ pressed }) => [styles.option, pressed && { backgroundColor: colors.surfaceMuted }]}
          >
            <Ionicons name={opt.icon} size={22} color={opt.destructive ? colors.danger : colors.text} />
            <Text variant="bodyStrong" tone={opt.destructive ? 'danger' : 'default'}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          style={({ pressed }) => [styles.cancel, pressed && { opacity: 0.7 }]}
        >
          <Text variant="bodyStrong" tone="secondary">
            Vazgeç
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  title: { paddingVertical: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    minHeight: 54,
    borderRadius: radius.md,
  },
  cancel: {
    marginTop: spacing.sm,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
});
