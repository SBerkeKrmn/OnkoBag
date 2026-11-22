// Birden çok ekranda kullanılan kullanıcı işlemleri: engelleme ve şikayet
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { usersApi } from '../api';
import { queryClient } from './queryClient';
import { displayNameOf } from './format';
import { showError } from './errors';

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
