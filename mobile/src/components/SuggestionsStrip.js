// "Seninle aynı yoldan geçenler": hasta–iyileşen eşleşme önerileri.
// Tedavideki kullanıcıya iyileşenler, iyileşene ise tedavidekiler önerilir.
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../api';
import { keys } from '../lib/queryClient';
import { displayNameOf } from '../lib/format';
import { Avatar, StatusBadge, Text } from './ui';
import { colors, radius, spacing } from '../constants/theme';

export default function SuggestionsStrip({ myStatus }) {
  const target = myStatus === 'SURVIVOR' ? 'ACTIVE_TREATMENT' : 'SURVIVOR';
  const { data } = useQuery({
    queryKey: keys.suggestions(target),
    queryFn: async () => (await usersApi.suggestions(target)).data,
  });

  if (!data?.length) return null;

  return (
    <View style={styles.container}>
      <View style={styles.head}>
        <Text variant="subheading">
          {target === 'SURVIVOR' ? 'Bu yoldan geçmiş olanlar' : 'Desteğine ihtiyaç duyanlar'}
        </Text>
        <Text variant="caption" tone="secondary">
          {target === 'SURVIVOR'
            ? 'Senin kanser türünü atlatmış üyelerle tanış.'
            : 'Senin yaşadıklarını şu an yaşayan üyelere umut ol.'}
        </Text>
      </View>
      <FlatList
        horizontal
        data={data}
        keyExtractor={(s) => s.user.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/user/${item.user.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`${displayNameOf(item.user)} profilini aç`}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
          >
            <Avatar user={item.user} size={56} />
            <Text variant="bodyStrong" numberOfLines={1} align="center">
              {displayNameOf(item.user)}
            </Text>
            <StatusBadge status={item.matchedOn.status} isVerified={item.matchedOn.isVerified} />
            <Text variant="tiny" tone="muted" numberOfLines={2} align="center">
              {item.matchedOn.cancerType.name}
              {item.matchedOn.remissionYear ? ` · ${item.matchedOn.remissionYear}’ten beri` : ''}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md, paddingVertical: spacing.sm },
  head: { paddingHorizontal: spacing.xl, gap: 2 },
  card: {
    width: 150,
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
