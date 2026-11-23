// Telefon bildirimleri (uygulama kapalıyken de gelir).
// - Giriş yapınca izin istenir, Expo push token alınıp backend'e kaydedilir
// - Çıkışta token backend'den silinir (başkasının bildirimi bu telefona düşmesin)
// - Bildirime dokununca ilgili ekran açılır (data.url)
// - Uygulama açıkken, o an açık olan sohbetin bildirimi gösterilmez
// Expo Go'da uzak bildirim desteklenmez (Android'de SDK 53'ten beri yok); orada
// tamamen devre dışıdır, development/preview/production build'de çalışır.
// Belge: https://docs.expo.dev/push-notifications/push-notifications-setup/
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { usersApi } from '../api';
import { isExpoGo } from './socialAuth';

export const pushSupported = Platform.OS !== 'web' && !isExpoGo;

// Expo Go'da modül hiç yüklenmez (Android'de yükleme hatası verir)
const Notifications = () => require('expo-notifications');

let registeredToken = null;
let activeConversationId = null;

/** Açık sohbet ekranı kendini bildirir; o sohbetin bildirimleri ön planda gösterilmez */
export function setActiveConversation(id) {
  activeConversationId = id;
}

/** Uygulama açıkken gelen bildirimlerin nasıl gösterileceği (kök düzende bir kez) */
export function configureNotificationHandler() {
  if (!pushSupported) return;
  Notifications().setNotificationHandler({
    handleNotification: async (notification) => {
      const data = notification.request.content.data ?? {};
      const hidden = Boolean(data.conversationId) && data.conversationId === activeConversationId;
      return { shouldPlaySound: !hidden, shouldSetBadge: false, shouldShowBanner: !hidden, shouldShowList: !hidden };
    },
  });
}

/** İzin ister, token alır ve backend'e kaydeder. İzin verilmezse sessizce vazgeçer. */
export async function registerForPushNotifications() {
  if (!pushSupported) return null;
  const N = Notifications();

  if (Platform.OS === 'android') {
    // Android'de kanal, izin isteminden ve token alınmasından önce oluşturulmalı
    await N.setNotificationChannelAsync('default', {
      name: 'Bildirimler',
      importance: N.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 120, 200],
      lightColor: '#6D5BD0',
    });
  }

  let { status } = await N.getPermissionsAsync();
  if (status !== 'granted') ({ status } = await N.requestPermissionsAsync());
  if (status !== 'granted') return null;

  const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
  const { data: token } = await N.getExpoPushTokenAsync({ projectId });
  await usersApi.registerPushToken(token, Platform.OS === 'ios' ? 'IOS' : 'ANDROID');
  registeredToken = token;
  return token;
}

/** Çıkışta çağrılır (oturum hâlâ açıkken) */
export async function unregisterPushNotifications() {
  if (!registeredToken) return;
  const token = registeredToken;
  registeredToken = null;
  await usersApi.removePushToken(token).catch(() => {});
}

/**
 * Bildirime dokunulunca yönlendirme. onOpen(url) çağrılır.
 * Uygulama bildirimle kapalıyken açıldıysa o bildirim de işlenir. Abonelikten çıkma fonksiyonu döner.
 */
export function subscribeToNotificationTaps(onOpen) {
  if (!pushSupported) return () => {};
  const N = Notifications();
  const handle = (response) => {
    const url = response?.notification?.request?.content?.data?.url;
    if (typeof url === 'string' && url.startsWith('/')) onOpen(url);
  };
  const last = N.getLastNotificationResponse();
  if (last) {
    handle(last);
    N.clearLastNotificationResponse();
  }
  const sub = N.addNotificationResponseReceivedListener(handle);
  return () => sub.remove();
}
