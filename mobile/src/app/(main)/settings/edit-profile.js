import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, Button, Chip, Header, Screen, Text, TextField } from '../../../components/ui';
import { usersApi } from '../../../api';
import { useAuth } from '../../../context/AuthContext';
import { pickAndUploadImage } from '../../../lib/pickImage';
import { fieldErrors, showError } from '../../../lib/errors';
import { colors, spacing } from '../../../constants/theme';

const GENDERS = [
  { value: 'FEMALE', label: 'Kadın' },
  { value: 'MALE', label: 'Erkek' },
  { value: 'OTHER', label: 'Diğer' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Belirtmek istemiyorum' },
];

export default function EditProfileScreen() {
  const { user, setUser } = useAuth();
  const [displayName, setDisplayName] = useState(user.displayName ?? '');
  const [bio, setBio] = useState(user.bio ?? '');
  const [city, setCity] = useState(user.city ?? '');
  const [birthYear, setBirthYear] = useState(user.birthYear ? String(user.birthYear) : '');
  const [gender, setGender] = useState(user.gender);
  const [avatar, setAvatar] = useState({ url: user.avatarUrl, mediaId: undefined });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const changeAvatar = async () => {
    setUploading(true);
    try {
      const media = await pickAndUploadImage({ square: true });
      if (media) setAvatar({ url: media.url, mediaId: media.id });
    } catch (err) {
      showError(err, 'Fotoğraf yüklenemedi');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setErrors({});
    try {
      const { data } = await usersApi.updateMe({
        displayName: displayName.trim() || null,
        bio: bio.trim() || null,
        city: city.trim() || null,
        birthYear: birthYear ? Number(birthYear) : null,
        gender: gender ?? null,
        ...(avatar.mediaId !== undefined ? { avatarMediaId: avatar.mediaId } : {}),
      });
      setUser(data);
      router.back();
    } catch (err) {
      const fe = fieldErrors(err);
      if (Object.keys(fe).length) setErrors(fe);
      else showError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll keyboard header={<Header back title="Profili düzenle" />}>
      <View style={styles.container}>
        <Pressable onPress={changeAvatar} accessibilityRole="button" accessibilityLabel="Profil fotoğrafını değiştir" style={styles.avatar}>
          <Avatar user={{ ...user, avatarUrl: avatar.url }} size={96} ring={false} />
          <View style={styles.camera}>
            <Ionicons name={uploading ? 'hourglass-outline' : 'camera'} size={16} color={colors.textOnPrimary} />
          </View>
        </Pressable>
        {avatar.url ? (
          <Text variant="label" tone="danger" align="center" onPress={() => setAvatar({ url: null, mediaId: null })}>
            Fotoğrafı kaldır
          </Text>
        ) : null}

        <TextField label="Görünen ad" value={displayName} onChangeText={setDisplayName} maxLength={60} error={errors.displayName} helper={`Kullanıcı adın: @${user.username}`} />
        <TextField label="Hakkımda" value={bio} onChangeText={setBio} multiline maxLength={500} placeholder="Kendinden ve yolculuğundan biraz bahset (isteğe bağlı)" error={errors.bio} />
        <TextField label="Şehir (isteğe bağlı)" value={city} onChangeText={setCity} maxLength={40} error={errors.city} />
        <TextField
          label="Doğum yılı (isteğe bağlı)"
          value={birthYear}
          onChangeText={(v) => setBirthYear(v.replace(/\D/g, '').slice(0, 4))}
          keyboardType="number-pad"
          error={errors.birthYear}
          helper="Profilinde gösterilmez."
        />
        <View style={{ gap: spacing.sm }}>
          <Text variant="label" tone="secondary">
            Cinsiyet (isteğe bağlı)
          </Text>
          <Text variant="caption" tone="muted">
            Seçersen profilinde herkese görünür. “Belirtmek istemiyorum” profilinde gösterilmez.
          </Text>
          <View style={styles.wrap}>
            {GENDERS.map((g) => (
              <Chip key={g.value} label={g.label} selected={gender === g.value} onPress={() => setGender(gender === g.value ? null : g.value)} />
            ))}
          </View>
        </View>

        <Button title="Kaydet" onPress={save} loading={saving} disabled={uploading} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg, paddingTop: spacing.md },
  avatar: { alignSelf: 'center' },
  camera: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.background,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
