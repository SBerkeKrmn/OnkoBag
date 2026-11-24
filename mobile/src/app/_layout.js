// Kök düzen: yazı tipleri, sağlayıcılar (React Query, oturum, soket) ve
// kök navigasyon yığını.
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  useFonts,
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';

import { useEffect } from 'react';
import { router } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { SocketProvider } from '../context/SocketContext';
import { queryClient } from '../lib/queryClient';
import { configureNotificationHandler, subscribeToNotificationTaps } from '../lib/pushNotifications';
import { colors } from '../constants/theme';

configureNotificationHandler();

/** Bildirime dokununca ilgili ekranı açar (oturum açıldıktan sonra) */
function NotificationTapHandler() {
  const { status } = useAuth();
  useEffect(() => {
    if (status !== 'signedIn') return undefined;
    return subscribeToNotificationTaps((url) => router.push(url));
  }, [status]);
  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SocketProvider>
            <StatusBar style="dark" />
            <NotificationTapHandler />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
              <Stack.Screen name="legal/[doc]" options={{ presentation: 'modal' }} />
            </Stack>
          </SocketProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
