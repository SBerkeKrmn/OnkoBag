import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Banner, Button, Header, Screen, Text, TextField } from '../../components/ui';
import { LogoMark } from '../../components/Logo';
import SocialButtons from '../../components/SocialButtons';
import { useAuth } from '../../context/AuthContext';
import { spacing } from '../../constants/theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef(null);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('E-posta ve şifreni gir.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/feed');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll keyboard header={<Header back />}>
      <View style={styles.top}>
        <LogoMark size={48} />
        <Text variant="title" style={{ marginTop: spacing.lg }}>
          Tekrar hoş geldin
        </Text>
        <Text variant="body" tone="secondary">
          Topluluğun seni bekliyor.
        </Text>
      </View>

      <View style={styles.form}>
        <SocialButtons divider />
        {error ? <Banner tone="danger" message={error} /> : null}
        <TextField
          label="E-posta"
          icon="mail-outline"
          placeholder="ornek@eposta.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <TextField
          ref={passwordRef}
          label="Şifre"
          icon="lock-closed-outline"
          placeholder="Şifren"
          value={password}
          onChangeText={setPassword}
          secure
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        <Text
          variant="label"
          tone="primary"
          align="right"
          onPress={() => router.push('/forgot-password')}
          accessibilityRole="link"
          style={styles.forgot}
        >
          Şifremi unuttum
        </Text>
        <Button title="Giriş yap" onPress={submit} loading={loading} />
      </View>

      <View style={styles.footer}>
        <Text variant="body" tone="secondary">
          Hesabın yok mu?{' '}
          <Text variant="bodyStrong" tone="primary" onPress={() => router.replace('/register')} accessibilityRole="link">
            Hesap oluştur
          </Text>
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { paddingTop: spacing.lg, paddingBottom: spacing.xl, gap: spacing.xs },
  form: { gap: spacing.lg },
  forgot: { marginTop: -spacing.sm, paddingVertical: spacing.xs },
  footer: { marginTop: 'auto', paddingTop: spacing.xxl, alignItems: 'center' },
});
