// Kısa metin düzenleme penceresi (ör. yorum düzenleme)
import { useEffect, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { Button, KeyboardAwareView, Text, TextField } from './ui';
import { colors, radius, spacing } from '../constants/theme';

/** onSave(text) false dönerse pencere açık kalır */
export default function EditTextDialog({ visible, title, initialValue = '', maxLength = 2000, onSave, onClose }) {
  const [value, setValue] = useState(initialValue);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  if (!visible) return null;
  const trimmed = value.trim();

  const save = async () => {
    setBusy(true);
    const ok = await onSave(trimmed);
    setBusy(false);
    if (ok !== false) onClose();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAwareView style={styles.backdrop}>
        <View style={styles.card}>
          <Text variant="subheading">{title}</Text>
          <TextField value={value} onChangeText={setValue} multiline maxLength={maxLength} autoFocus inputStyle={{ minHeight: 90 }} />
          <View style={styles.buttons}>
            <Button title="Vazgeç" variant="outline" size="md" style={{ flex: 1 }} onPress={onClose} />
            <Button
              title="Kaydet"
              size="md"
              style={{ flex: 1 }}
              loading={busy}
              disabled={!trimmed || trimmed === initialValue.trim()}
              onPress={save}
            />
          </View>
        </View>
      </KeyboardAwareView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.md },
  buttons: { flexDirection: 'row', gap: spacing.md },
});
