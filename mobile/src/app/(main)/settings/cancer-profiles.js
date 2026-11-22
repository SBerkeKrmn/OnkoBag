// Kanser profillerim: listele, ana profil yap, durum güncelle, sil, yeni ekle
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Banner, Button, Card, Header, Screen, StatusBadge, Text, TextField } from '../../../components/ui';
import CancerTypePicker from '../../../components/CancerTypePicker';
import StatusChoice from '../../../components/StatusChoice';
import { usersApi } from '../../../api';
import { useAuth } from '../../../context/AuthContext';
import { keys } from '../../../lib/queryClient';
import { showError } from '../../../lib/errors';
import { spacing } from '../../../constants/theme';

function AddProfileForm({ existingIds, onDone }) {
  const [cancerType, setCancerType] = useState(null);
  const [status, setStatus] = useState(null);
  const [diagnosisYear, setDiagnosisYear] = useState('');
  const [remissionYear, setRemissionYear] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await usersApi.addCancerProfile({
        cancerTypeId: cancerType.id,
        status,
        diagnosisYear: diagnosisYear ? Number(diagnosisYear) : undefined,
        remissionYear: status === 'SURVIVOR' && remissionYear ? Number(remissionYear) : undefined,
      });
      onDone(data);
    } catch (err) {
      showError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <StatusChoice value={status} onChange={setStatus} />
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <TextField style={{ flex: 1 }} label="Tanı yılı" value={diagnosisYear} onChangeText={(v) => setDiagnosisYear(v.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" />
        {status === 'SURVIVOR' ? (
          <TextField style={{ flex: 1 }} label="İyileşme yılı" value={remissionYear} onChangeText={(v) => setRemissionYear(v.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" />
        ) : null}
      </View>
      <CancerTypePicker value={cancerType?.id} onChange={setCancerType} excludeIds={existingIds} />
      <Button title="Profili ekle" onPress={save} loading={saving} disabled={!cancerType || !status} />
    </View>
  );
}

export default function CancerProfilesScreen() {
  const { user, setUser } = useAuth();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const profiles = user.cancerProfiles ?? [];

  const apply = (data) => {
    setUser(data);
    queryClient.invalidateQueries({ queryKey: keys.rooms });
    queryClient.invalidateQueries({ queryKey: ['users', 'suggestions'] });
    queryClient.invalidateQueries({ queryKey: keys.feed });
  };

  const run = async (fn) => {
    try {
      apply((await fn()).data);
    } catch (err) {
      showError(err);
    }
  };

  const toggleStatus = (p) => {
    const next = p.status === 'SURVIVOR' ? 'ACTIVE_TREATMENT' : 'SURVIVOR';
    Alert.alert(
      next === 'SURVIVOR' ? 'Bu hastalığı atlattın mı? 💜' : 'Durumunu güncelle',
      next === 'SURVIVOR'
        ? 'Profilin “İyileşen” olarak güncellenecek. Doğrulanmış iyileşen rozeti için moderatör onayı gerekir.'
        : 'Profilin “Tedavide” olarak güncellenecek.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Güncelle', onPress: () => run(() => usersApi.updateCancerProfile(p.id, { status: next })) },
      ],
    );
  };

  const remove = (p) =>
    Alert.alert(`${p.cancerType.name} profilden kaldırılsın mı?`, 'Bu türün sohbet odasından da ayrılacaksın.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Kaldır', style: 'destructive', onPress: () => run(() => usersApi.removeCancerProfile(p.id)) },
    ]);

  return (
    <Screen scroll keyboard header={<Header back title="Kanser profillerim" />}>
      <View style={styles.container}>
        <Banner
          tone="primary"
          icon="information-circle-outline"
          message="Ana profilin isminin yanında görünür. Her kanser türü için ilgili topluluğa ve sohbet odasına katılırsın."
        />

        {profiles.map((p) => (
          <Card key={p.id} style={{ gap: spacing.md }}>
            <View style={styles.cardHead}>
              <Text variant="subheading" style={{ flex: 1 }}>
                {p.cancerType.name}
              </Text>
              {p.isPrimary ? (
                <Text variant="tiny" tone="primary">
                  ANA PROFİL
                </Text>
              ) : null}
            </View>
            <StatusBadge size="md" status={p.status} isVerified={p.isVerified} />
            {p.status === 'SURVIVOR' && !p.isVerified ? (
              <Text variant="caption" tone="muted">
                Doğrulanmış iyileşen rozeti moderatör incelemesinden sonra verilir.
              </Text>
            ) : null}
            <View style={styles.actions}>
              {!p.isPrimary ? (
                <Button title="Ana profil yap" size="sm" variant="secondary" fullWidth={false} onPress={() => run(() => usersApi.updateCancerProfile(p.id, { isPrimary: true }))} />
              ) : null}
              <Button
                title={p.status === 'SURVIVOR' ? 'Tedavideyim' : 'Atlattım'}
                size="sm"
                variant="outline"
                fullWidth={false}
                onPress={() => toggleStatus(p)}
              />
              {profiles.length > 1 ? <Button title="Kaldır" size="sm" variant="danger" fullWidth={false} onPress={() => remove(p)} /> : null}
            </View>
          </Card>
        ))}

        {adding ? (
          <Card style={{ gap: spacing.lg }}>
            <Text variant="subheading">Yeni kanser profili</Text>
            <AddProfileForm
              existingIds={profiles.map((p) => p.cancerType.id)}
              onDone={(data) => {
                apply(data);
                setAdding(false);
              }}
            />
            <Button title="Vazgeç" variant="ghost" onPress={() => setAdding(false)} />
          </Card>
        ) : (
          <Button title="Başka bir kanser türü ekle" icon="add" variant="secondary" onPress={() => setAdding(true)} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg, paddingTop: spacing.md },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
