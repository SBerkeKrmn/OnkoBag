// API hatalarına göre kullanıcıyı yönlendiren ortak hata gösterimi
import { Alert } from 'react-native';
import { router } from 'expo-router';

export function showError(error, title = 'İşlem tamamlanamadı') {
  if (error?.code === 'EMAIL_NOT_VERIFIED') {
    Alert.alert(
      'E-posta doğrulaması gerekli',
      'Paylaşım yapabilmek ve mesaj gönderebilmek için e-posta adresini doğrulaman gerekiyor.',
      [
        { text: 'Sonra', style: 'cancel' },
        { text: 'Şimdi doğrula', onPress: () => router.push('/verify-email') },
      ],
    );
    return;
  }
  Alert.alert(title, error?.message ?? 'Beklenmeyen bir hata oluştu. Lütfen tekrar dene.');
}

/** zod doğrulama hatalarını { alan: mesaj } nesnesine çevirir */
export function fieldErrors(error) {
  if (error?.code !== 'VALIDATION_ERROR' || !Array.isArray(error.details)) return {};
  return Object.fromEntries(error.details.map((d) => [d.path.split('.').pop(), d.message]));
}
