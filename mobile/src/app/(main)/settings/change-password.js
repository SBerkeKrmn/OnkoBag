import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Banner, Button, Header, Screen, Text, TextField } from '../../../components/ui';
import { authApi } from '../../../api';
import { useAuth } from '../../../context/AuthContext';
import { spacing } from '../../../constants/theme';

export default function ChangePasswordScreen() {
  const { saveTokens } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (next !== confirm) {
      setError('Yeni şifreler eşleşmiyor.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { data } = await authApi.changePassword({ currentPassword: current, newPassword: next });
      await saveTokens(data);
      Alert.alert('Şifren değiştirildi', 'Diğer cihazlardaki oturumların kapatıldı.');
      router.back();
    } catch (err) {
      setError(err.details?.[0]?.message ?? err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll keyboard header={<Header back title="Şifre değiştir" />}>
      <View style={styles.container}>
        {error ? <Banner tone="danger" message={error} /> : null}
        <TextField label="Mevcut şifre" value={current} onChangeText={setCurrent} secure textContentType="password" />
        <TextField label="Yeni şifre" value={next} onChangeText={setNext} secure textContentType="newPassword" helper="En az 8 karakter, en az bir harf ve bir rakam." />
        <TextField label="Yeni şifre (tekrar)" value={confirm} onChangeText={setConfirm} secure textContentType="newPassword" />
        <Button title="Şifreyi değiştir" onPress={submit} loading={loading} disabled={!current || next.length < 8} />
        <Text variant="caption" tone="muted">
          Güvenliğin için şifre değiştiğinde diğer cihazlardaki oturumların kapatılır.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ container: { gap: spacing.lg, paddingTop: spacing.md } });
