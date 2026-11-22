// Giriş/kayıt ekranları. Oturum açıldıktan sonraki yönlendirmeyi ekranlar kendisi
// yapar (kayıt → e-posta doğrulama, giriş → akış); açılıştaki yönlendirme app/index.js'te.
import { Stack } from 'expo-router';
import { colors } from '../../constants/theme';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}
