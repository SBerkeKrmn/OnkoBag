// Şikayet (modal). Kendine zarar verme riski seçilirse acil yardım bilgisi gösterilir.
import { useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Banner, Button, Header, Screen, Text, TextField } from '../../components/ui';
import { reportsApi } from '../../api';
import { showError } from '../../lib/errors';
import { EMERGENCY_NUMBER } from '../../constants/config';
import { colors, radius, spacing } from '../../constants/theme';

const REASONS = [
  { value: 'HARASSMENT', label: 'Taciz veya zorbalık', icon: 'hand-left-outline' },
  { value: 'MISINFORMATION', label: 'Yanlış veya tehlikeli tıbbi bilgi', icon: 'medkit-outline' },
  { value: 'SELF_HARM', label: 'Kendine zarar verme riski', icon: 'heart-dislike-outline' },
  { value: 'INAPPROPRIATE_CONTENT', label: 'Uygunsuz veya rahatsız edici içerik', icon: 'eye-off-outline' },
  { value: 'SPAM', label: 'Spam, reklam veya dolandırıcılık', icon: 'megaphone-outline' },
  { value: 'IMPERSONATION', label: 'Sahte hesap / kimliğe bürünme', icon: 'person-remove-outline' },
  { value: 'OTHER', label: 'Diğer', icon: 'ellipsis-horizontal-circle-outline' },
];

const TARGET_LABELS = {
  USER: 'kullanıcıyı',
  POST: 'gönderiyi',
  COMMENT: 'yorumu',
  ROOM_MESSAGE: 'mesajı',
  DIRECT_MESSAGE: 'mesajı',
};

export default function ReportScreen() {
  const { targetType, targetId } = useLocalSearchParams();
  const [reason, setReason] = useState(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await reportsApi.create({ targetType, targetId, reason, description: description.trim() || undefined });
      Alert.alert(
        'Şikayetin alındı',
        'Topluluğumuzu güvenli tuttuğun için teşekkürler. Moderatörlerimiz en kısa sürede inceleyecek. İstersen bu kullanıcıyı engelleyebilirsin.',
      );
      router.back();
    } catch (err) {
      showError(err, 'Şikayet gönderilemedi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      scroll
      keyboard
      header={<Header title="Şikayet et" left={<Button title="Kapat" variant="ghost" size="sm" fullWidth={false} onPress={() => router.back()} />} />}
      footer={
        <View style={styles.footer}>
          <Button title="Şikayeti gönder" onPress={submit} loading={loading} disabled={!reason} />
        </View>
      }
    >
      <View style={styles.container}>
        <Text variant="body" tone="secondary">
          Bu {TARGET_LABELS[targetType] ?? 'içeriği'} neden şikayet ediyorsun? Şikayetin gizli tutulur; karşı tarafa
          kimin şikayet ettiği bildirilmez.
        </Text>

        <View style={{ gap: spacing.sm }}>
          {REASONS.map((r) => {
            const selected = reason === r.value;
            return (
              <Pressable
                key={r.value}
                onPress={() => setReason(r.value)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                style={[styles.option, selected && styles.selected]}
              >
                <Ionicons name={r.icon} size={20} color={selected ? colors.primary : colors.textSecondary} />
                <Text variant={selected ? 'bodyStrong' : 'body'} style={{ flex: 1 }}>
                  {r.label}
                </Text>
                <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={20} color={selected ? colors.primary : colors.border} />
              </Pressable>
            );
          })}
        </View>

        {reason === 'SELF_HARM' ? (
          <View style={{ gap: spacing.md }}>
            <Banner
              tone="danger"
              title="Acil bir durum varsa hemen yardım iste"
              message={`Bir kişinin hayatı tehlikedeyse ${EMERGENCY_NUMBER}’yi ara. Bu şikayet moderatörlerimize öncelikli olarak iletilir.`}
            />
            <Button
              title={`${EMERGENCY_NUMBER}’yi ara`}
              icon="call"
              variant="danger"
              onPress={() => Linking.openURL(`tel:${EMERGENCY_NUMBER}`)}
            />
          </View>
        ) : null}

        <TextField
          label="Açıklama (isteğe bağlı)"
          placeholder="Moderatörlerin durumu anlamasına yardımcı olacak bilgiler"
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={1000}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xl, paddingTop: spacing.md },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  footer: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
});
