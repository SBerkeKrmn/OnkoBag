// Moderasyon işlemleri için gerekçe penceresi. Her işlem denetim kaydına bu
// gerekçeyle yazılır; uyarılarda gerekçe kullanıcıya da iletilir.
import { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, KeyboardAwareView, Text, TextField } from './ui';
import { colors, radius, spacing } from '../constants/theme';

/**
 * dialog: { title, message?, confirmText, destructive?, presets?: string[],
 *           durations?: [{ label, days|null }], onConfirm({ reason, until }) }
 */
export default function ReasonDialog({ dialog, onClose }) {
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setReason('');
    setDuration(dialog?.durations?.[0] ?? null);
    setBusy(false);
  }, [dialog]);

  if (!dialog) return null;
  const valid = reason.trim().length >= 3;

  const confirm = async () => {
    setBusy(true);
    const until = duration?.days ? new Date(Date.now() + duration.days * 24 * 60 * 60 * 1000).toISOString() : undefined;
    const ok = await dialog.onConfirm({ reason: reason.trim(), until });
    setBusy(false);
    if (ok !== false) onClose();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAwareView style={styles.backdrop}>
        <View style={styles.card}>
          <ScrollView contentContainerStyle={{ gap: spacing.md }} keyboardShouldPersistTaps="handled">
            <Text variant="subheading">{dialog.title}</Text>
            {dialog.message ? (
              <Text variant="body" tone="secondary">
                {dialog.message}
              </Text>
            ) : null}

            {dialog.durations ? (
              <View style={{ gap: spacing.sm }}>
                <Text variant="label" tone="secondary">
                  Süre
                </Text>
                <View style={styles.wrap}>
                  {dialog.durations.map((d) => (
                    <Chip key={d.label} label={d.label} selected={duration?.label === d.label} onPress={() => setDuration(d)} />
                  ))}
                </View>
              </View>
            ) : null}

            {dialog.presets?.length ? (
              <View style={styles.wrap}>
                {dialog.presets.map((p) => (
                  <Chip key={p} label={p} selected={reason === p} onPress={() => setReason(p)} />
                ))}
              </View>
            ) : null}

            <TextField
              label="Gerekçe"
              value={reason}
              onChangeText={setReason}
              placeholder="Kısa bir açıklama yaz (en az 3 karakter)"
              multiline
              maxLength={1000}
              inputStyle={{ minHeight: 70 }}
            />

            <View style={styles.buttons}>
              <Button title="Vazgeç" variant="outline" size="md" style={{ flex: 1 }} onPress={onClose} />
              <Button
                title={dialog.confirmText}
                variant={dialog.destructive ? 'danger' : 'primary'}
                size="md"
                style={{ flex: 1 }}
                disabled={!valid}
                loading={busy}
                onPress={confirm}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAwareView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, maxHeight: '85%' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  buttons: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
});
