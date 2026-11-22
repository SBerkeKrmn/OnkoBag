// Uygulama içinden hesap silme (App Store 5.1.1(v) ve Google Play hesap silme şartı).
// Şifreli hesaplar şifreyle, yalnızca Google/Apple ile giren hesaplar açık onayla siler.
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Banner, Button, Checkbox, Header, Screen, Text, TextField } from '../../../components/ui';
import { usersApi } from '../../../api';
import { useAuth } from '../../../context/AuthContext';
import { signOutSocial } from '../../../lib/socialAuth';
import { colors, spacing } from '../../../constants/theme';

const CONSEQUENCES = [
  'Profilin, kanser profillerin ve kişisel bilgilerin kalıcı olarak silinir.',
  'Gönderilerin ve yorumların kaldırılır.',
  'Tüm sohbet odalarından ayrılırsın; özel mesajlarında adın “Silinmiş kullanıcı” olarak görünür.',
  'Bağlı Google/Apple hesabının OnkoBağ ile bağlantısı kaldırılır.',
  'Bu işlem geri alınamaz.',
];

export default function DeleteAccountScreen() {
  const { user, clearSession } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const hasPassword = user?.hasPassword !== false;

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
            await usersApi.deleteMe(hasPassword ? { password } : { confirm: true });
            await signOutSocial();
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
        {hasPassword ? (
          <TextField label="Onaylamak için şifreni gir" value={password} onChangeText={setPassword} secure textContentType="password" />
        ) : (
          <Checkbox
            checked={confirmed}
            onToggle={() => setConfirmed((c) => !c)}
            label="Hesabımın ve tüm verilerimin kalıcı olarak silineceğini anlıyorum."
          />
        )}
        <Button
          title="Hesabımı kalıcı olarak sil"
          variant="danger"
          icon="trash-outline"
          onPress={remove}
          loading={loading}
          disabled={hasPassword ? !password : !confirmed}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg, paddingTop: spacing.md },
  item: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.danger, marginTop: 8 },
});
