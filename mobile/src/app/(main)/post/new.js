// Yeni gönderi (modal): topluluk, kategori, başlık, metin, en fazla 4 görsel
import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Banner, Button, Chip, Header, Screen, Text, TextField } from '../../../components/ui';
import { mediaApi, postsApi } from '../../../api';
import { useAuth } from '../../../context/AuthContext';
import { POST_CATEGORIES } from '../../../lib/format';
import { showError } from '../../../lib/errors';
import { addNewPost } from '../../../lib/postCache';
import { colors, radius, spacing } from '../../../constants/theme';

const MAX_IMAGES = 4;

export default function NewPostScreen() {
  const { user, refreshUser } = useAuth();
  const communities = user?.cancerProfiles ?? [];

  const [cancerTypeId, setCancerTypeId] = useState(communities[0]?.cancerType.id ?? null);
  const [category, setCategory] = useState('EXPERIENCE');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);

  const dirty = content.trim() || title.trim() || images.length;

  const close = () => {
    if (!dirty) return router.back();
    return Alert.alert('Taslak silinsin mi?', 'Yazdıkların kaydedilmeyecek.', [
      { text: 'Yazmaya devam et', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const pickImages = async () => {
    // Sistem fotoğraf seçicisi kullanılır; galeriye tam erişim izni gerekmez
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - images.length,
      quality: 0.8,
    });
    if (!result.canceled) setImages((prev) => [...prev, ...result.assets].slice(0, MAX_IMAGES));
  };

  const submit = async () => {
    if (!user?.emailVerified) {
      showError({ code: 'EMAIL_NOT_VERIFIED' });
      return;
    }
    setLoading(true);
    try {
      // Görseller sırayla değil aynı anda yüklenir
      const uploaded = await Promise.all(images.map((asset) => mediaApi.upload(asset)));
      const { data } = await postsApi.create({
        cancerTypeId,
        category,
        title: title.trim() || undefined,
        content: content.trim(),
        mediaIds: uploaded.map((m) => m.id),
      });
      // Yeni gönderi akışa ve profile hemen eklenir; detay ekranı yeniden yüklemeden açılır
      addNewPost(data, user.id);
      refreshUser().catch(() => {});
      router.replace(`/post/${data.id}`);
    } catch (err) {
      showError(err, 'Gönderi paylaşılamadı');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      keyboard
      scroll
      header={
        <Header
          title="Yeni gönderi"
          left={<Button title="Vazgeç" variant="ghost" size="sm" fullWidth={false} onPress={close} />}
          right={
            <Button
              title="Paylaş"
              size="sm"
              fullWidth={false}
              loading={loading}
              disabled={!content.trim() || !cancerTypeId}
              onPress={submit}
            />
          }
        />
      }
    >
      <View style={styles.container}>
        <View style={{ gap: spacing.sm }}>
          <Text variant="label" tone="secondary">
            Topluluk
          </Text>
          <View style={styles.wrap}>
            {communities.map((p) => (
              <Chip
                key={p.cancerType.id}
                label={p.cancerType.name}
                selected={cancerTypeId === p.cancerType.id}
                onPress={() => setCancerTypeId(p.cancerType.id)}
              />
            ))}
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text variant="label" tone="secondary">
            Konu
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {POST_CATEGORIES.map((c) => (
              <Chip key={c.value} label={c.label} icon={c.icon} selected={category === c.value} onPress={() => setCategory(c.value)} />
            ))}
          </ScrollView>
        </View>

        <TextField placeholder="Başlık (isteğe bağlı)" value={title} onChangeText={setTitle} maxLength={150} />
        <TextField
          placeholder="Deneyimini, sorunu veya umut veren hikayeni paylaş…"
          value={content}
          onChangeText={setContent}
          multiline
          maxLength={5000}
          inputStyle={{ minHeight: 160 }}
        />

        <View style={styles.images}>
          {images.map((img, i) => (
            <View key={img.uri} style={styles.thumbWrap}>
              <Image source={{ uri: img.uri }} style={styles.thumb} />
              <Pressable
                onPress={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                accessibilityRole="button"
                accessibilityLabel="Görseli kaldır"
                style={styles.remove}
              >
                <Ionicons name="close" size={16} color={colors.textOnPrimary} />
              </Pressable>
            </View>
          ))}
          {images.length < MAX_IMAGES ? (
            <Pressable onPress={pickImages} accessibilityRole="button" accessibilityLabel="Görsel ekle" style={styles.addImage}>
              <Ionicons name="image-outline" size={26} color={colors.primary} />
              <Text variant="tiny" tone="primary">
                Görsel ekle
              </Text>
            </Pressable>
          ) : null}
        </View>

        <Banner
          tone="info"
          message="Kişisel deneyimini paylaş; ilaç veya tedavi önerisi verme. Başkalarının özel bilgilerini ve tanınabilir yüzlerini izinsiz paylaşma."
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xl, paddingTop: spacing.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  images: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  thumbWrap: { width: 84, height: 84 },
  thumb: { width: 84, height: 84, borderRadius: radius.md },
  remove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImage: {
    width: 84,
    height: 84,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    backgroundColor: colors.primaryLight,
  },
});
