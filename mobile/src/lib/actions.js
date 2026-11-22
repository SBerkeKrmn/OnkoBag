// Birden çok ekranda kullanılan kullanıcı işlemleri: engelleme ve şikayet
import { Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { usersApi } from '../api';
import { queryClient } from './queryClient';
import { displayNameOf } from './format';
import { showError } from './errors';

/**
 * Onay penceresi. Web'de Alert düğmeleri desteklenmediği için tarayıcının confirm'ü kullanılır.
 */
export function confirmAction({ title, message, confirmText = 'Tamam', destructive = false, onConfirm }) {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    if (window.confirm([title, message].filter(Boolean).join('\n\n'))) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}

/** Çıkış onayı */
export function confirmLogout(logout) {
  confirmAction({
    title: 'Çıkış yapılsın mı?',
    message: 'Tekrar giriş yapana kadar mesaj ve bildirim alamazsın.',
    confirmText: 'Çıkış yap',
    destructive: true,
    onConfirm: logout,
  });
}

/** Şikayet ekranını açar */
export function openReport(targetType, targetId, label) {
  router.push({ pathname: '/report', params: { targetType, targetId: String(targetId), label: label ?? '' } });
}

/** Onay alıp kullanıcıyı engeller; tüm listeleri tazeler */
export function confirmBlock(user, onDone) {
  Alert.alert(
    `${displayNameOf(user)} engellensin mi?`,
    'Engellediğin kişi seninle mesajlaşamaz; gönderileri, yorumları ve mesajları sana gösterilmez. Engeli Ayarlar’dan kaldırabilirsin.',
    [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Engelle',
        style: 'destructive',
        onPress: async () => {
          try {
            await usersApi.block(user.id);
            await queryClient.invalidateQueries();
            onDone?.();
          } catch (err) {
            showError(err);
          }
        },
      },
    ],
  );
}
