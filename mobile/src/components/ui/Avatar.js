import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from './Text';
import { colors } from '../../constants/theme';

const PALETTE = ['#6D5BD0', '#3E9C7A', '#C46B9A', '#3F7CC4', '#C98A14', '#7A6AD8', '#2E8C8C'];

function initialsOf(user) {
  const source = (user?.displayName || user?.username || '?').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : source.slice(0, 2);
  return letters.toLocaleUpperCase('tr-TR');
}

function colorOf(user) {
  const key = user?.id ?? user?.username ?? '';
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) % 1000;
  return PALETTE[hash % PALETTE.length];
}

/** Kullanıcı avatarı. İyileşenlerde yeşil, tedavidekilerde lavanta halka gösterilir. */
export default function Avatar({ user, size = 44, ring = true }) {
  const status = user?.primaryCancer?.status;
  const ringColor = status === 'SURVIVOR' ? colors.survivor : status ? colors.primaryMuted : 'transparent';
  const inner = ring && status ? size - 6 : size;

  let content;
  if (!user) {
    content = (
      <View style={[styles.circle, { width: inner, height: inner, backgroundColor: colors.surfaceMuted }]}>
        <Ionicons name="person" size={inner * 0.5} color={colors.textMuted} />
      </View>
    );
  } else if (user.avatarUrl) {
    content = (
      <Image
        source={{ uri: user.avatarUrl }}
        style={{ width: inner, height: inner, borderRadius: inner / 2 }}
        accessibilityIgnoresInvertColors
      />
    );
  } else {
    content = (
      <View style={[styles.circle, { width: inner, height: inner, backgroundColor: colorOf(user) }]}>
        <Text tone="inverse" style={{ fontSize: inner * 0.38, lineHeight: inner * 0.46, fontFamily: 'Nunito_800ExtraBold' }}>
          {initialsOf(user)}
        </Text>
      </View>
    );
  }

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={user ? `${user.displayName || user.username} profil fotoğrafı` : 'Silinmiş kullanıcı'}
      style={[
        styles.ring,
        { width: size, height: size, borderRadius: size / 2, borderColor: ring ? ringColor : 'transparent' },
      ]}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  circle: { borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});
