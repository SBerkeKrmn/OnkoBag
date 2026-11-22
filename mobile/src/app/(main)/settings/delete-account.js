// Uygulama içinden hesap silme (App Store 5.1.1(v) ve Google Play hesap silme şartı)
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Banner, Button, Header, Screen, Text, TextField } from '../../../components/ui';
import { usersApi } from '../../../api';
import { useAuth } from '../../../context/AuthContext';
import { colors, spacing } from '../../../constants/theme';

const CONSEQUENCES = [
  'Profilin, kanser profillerin ve kişisel bilgilerin kalıcı olarak silinir.',
  'Gönderilerin ve yorumların kaldırılır.',
  'Tüm sohbet odalarından ayrılırsın; özel mesajlarında adın “Silinmiş kullanıcı” olarak görünür.',
  'Bu işlem geri alınamaz.',
];

export default function DeleteAccountScreen() {
  const { clearSession } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const remove = () =>
    Alert.alert('Hesabın kalıcı olarak silinecek', 'Emin misin? Bu işlem geri alınamaz.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Hesabımı sil',
        style: 'destructive',
        onPress: async () => {
          setError(null);
          setLoading(true);
          try {
            await usersApi.deleteMe(password);
            await clearSession();
          } catch (err) {
            setError(err.message);
            setLoading(false);
          }
        },
      },
    ]);

  return (
    <Screen scroll keyboard header={<Header back title="Hesabımı sil" />}>
      <View style={styles.container}>
        <Text variant="body" tone="secondary">
          Seni özleyeceğiz. Hesabını sildiğinde:
        </Text>
        <View style={{ gap: spacing.sm }}>
          {CONSEQUENCES.map((c) => (
            <View key={c} style={styles.item}>
              <View style={styles.bullet} />
              <Text variant="body" style={{ flex: 1 }}>
                {c}
              </Text>
            </View>
          ))}
        </View>
        {error ? <Banner tone="danger" message={error} /> : null}
        <TextField label="Onaylamak için şifreni gir" value={password} onChangeText={setPassword} secure textContentType="password" />
        <Button title="Hesabımı kalıcı olarak sil" variant="danger" icon="trash-outline" onPress={remove} loading={loading} disabled={!password} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg, paddingTop: spacing.md },
  item: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.danger, marginTop: 8 },
});
