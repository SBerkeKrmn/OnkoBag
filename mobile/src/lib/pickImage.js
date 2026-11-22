// Tek görsel seçip yükler; yüklenen medya { id, url } döner (iptalde null)
import * as ImagePicker from 'expo-image-picker';
import { mediaApi } from '../api';

export async function pickAndUploadImage({ square = false } = {}) {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
    allowsEditing: square,
    ...(square ? { aspect: [1, 1] } : {}),
  });
  if (result.canceled || !result.assets?.length) return null;
  return mediaApi.upload(result.assets[0]);
}
