// Oturum gerektiren tüm ekranlar. Oturum yoksa karşılama ekranına yönlendirir.
import { Redirect, Stack } from 'expo-router';
import { View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../constants/theme';

export default function MainLayout() {
  const { status } = useAuth();

  if (status === 'loading') return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  if (status === 'signedOut') return <Redirect href="/welcome" />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="post/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="report" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
