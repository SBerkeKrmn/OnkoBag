// Geçici karşılama ekranı: backend bağlantısını test eder.
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { apiRequest } from '../api/client';
import { colors, fontSize, spacing } from '../constants/theme';

export default function WelcomeScreen() {
  const [status, setStatus] = useState({ loading: true, count: 0, error: null });

  useEffect(() => {
    apiRequest('/cancer-types')
      .then((res) => setStatus({ loading: false, count: res.data.length, error: null }))
      .catch((err) => setStatus({ loading: false, count: 0, error: err.message }));
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>OnkoBağ</Text>
        <Text style={styles.subtitle}>Aynı yolu yürüyenlerle bağ kur.</Text>

        <View style={styles.statusBox}>
          {status.loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : status.error ? (
            <Text style={styles.error}>Sunucuya bağlanılamadı: {status.error}</Text>
          ) : (
            <Text style={styles.ok}>Sunucu bağlantısı başarılı · {status.count} kanser türü</Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.primary },
  subtitle: { fontSize: fontSize.md, color: colors.textMuted, marginTop: spacing.sm },
  statusBox: {
    marginTop: spacing.xl,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surface,
    minWidth: 260,
    alignItems: 'center',
  },
  ok: { color: colors.survivor, fontSize: fontSize.sm },
  error: { color: colors.danger, fontSize: fontSize.sm, textAlign: 'center' },
});
