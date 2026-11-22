// Avatar + ad + rozet satırı (gönderi başlığı, yorum, liste öğesi)
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Avatar, StatusBadge, Text } from './ui';
import { displayNameOf } from '../lib/format';
import { spacing } from '../constants/theme';

export default function UserLine({ user, meta, size = 42, showBadge = true, right, onPress }) {
  const press = onPress ?? (user ? () => router.push(`/user/${user.id}`) : undefined);
  const primary = user?.primaryCancer;

  return (
    <View style={styles.row}>
      <Pressable onPress={press} disabled={!press} accessibilityRole="button" style={styles.left}>
        <Avatar user={user} size={size} />
        <View style={styles.texts}>
          <View style={styles.nameRow}>
            <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
              {displayNameOf(user)}
            </Text>
            {meta ? (
              <Text variant="caption" tone="muted">
                · {meta}
              </Text>
            ) : null}
          </View>
          {showBadge && primary ? (
            <StatusBadge status={primary.status} isVerified={primary.isVerified} cancerTypeName={primary.cancerType?.name} />
          ) : user ? (
            <Text variant="caption" tone="muted" numberOfLines={1}>
              @{user.username}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  left: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  texts: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
