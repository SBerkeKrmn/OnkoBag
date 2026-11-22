// Şifre sıfırlama: 1) e-posta → kod gönder 2) kod + yeni şifre
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Banner, Button, Header, Screen, Text, TextField } from '../../components/ui';
import CodeInput from '../../components/CodeInput';
import { authApi } from '../../api';
import { spacing } from '../../constants/theme';

export default function ForgotPasswordScreen() {
  const [stage, setStage] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const sendCode = async () => {
    setError(null);
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      setStage('reset');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    setError(null);
    setLoading(true);
    try {
      await authApi.resetPassword({ email: email.trim(), code, newPassword: password });
      Alert.alert('Şifren güncellendi', 'Yeni şifrenle giriş yapabilirsin.');
      router.replace('/login');
    } catch (err) {
      setError(err.details?.[0]?.message ?? err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll keyboard header={<Header back title="Şifremi unuttum" />}>
      <View style={styles.container}>
        {stage === 'email' ? (
          <>
            <Text variant="body" tone="secondary">
              Hesabına kayıtlı e-posta adresini gir; sana 6 haneli bir sıfırlama kodu gönderelim.
            </Text>
            {error ? <Banner tone="danger" message={error} /> : null}
            <TextField
              label="E-posta"
              icon="mail-outline"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="send"
              onSubmitEditing={sendCode}
            />
            <Button title="Kod gönder" onPress={sendCode} loading={loading} disabled={!email.includes('@')} />
          </>
        ) : (
          <>
            <Text variant="body" tone="secondary">
              Hesap mevcutsa <Text variant="bodyStrong">{email.trim()}</Text> adresine bir kod gönderdik. Kod 15 dakika
              geçerlidir.
            </Text>
            {error ? <Banner tone="danger" message={error} /> : null}
            <CodeInput value={code} onChange={setCode} />
            <TextField
              label="Yeni şifre"
              icon="lock-closed-outline"
              placeholder="En az 8 karakter, harf ve rakam"
              value={password}
              onChangeText={setPassword}
              secure
              textContentType="newPassword"
            />
            <Button
              title="Şifremi güncelle"
              onPress={reset}
              loading={loading}
              disabled={code.length !== 6 || password.length < 8}
            />
            <Button title="Kodu tekrar gönder" variant="ghost" onPress={sendCode} />
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ container: { gap: spacing.lg, paddingTop: spacing.md } });
