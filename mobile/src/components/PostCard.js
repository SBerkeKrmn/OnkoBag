import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ActionSheet, Card, IconButton, Text } from './ui';
import UserLine from './UserLine';
import { postsApi } from '../api';
import { queryClient } from '../lib/queryClient';
import { categoryOf, timeAgo } from '../lib/format';
import { confirmBlock, openReport } from '../lib/actions';
import { showError } from '../lib/errors';
import { colors, radius, spacing } from '../constants/theme';

function MediaGrid({ media }) {
  if (!media?.length) return null;
  if (media.length === 1) {
    return <Image source={{ uri: media[0].url }} style={styles.single} resizeMode="cover" accessibilityLabel="Gönderi görseli" />;
  }
  return (
    <View style={styles.grid}>
      {media.slice(0, 4).map((m) => (
        <Image key={m.id} source={{ uri: m.url }} style={styles.gridItem} resizeMode="cover" accessibilityLabel="Gönderi görseli" />
      ))}
    </View>
  );
}

/** detail=true: gönderi detay ekranında tam metin, kart dokunulabilir değil */
export default function PostCard({ post, detail = false, onDeleted }) {
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [menuOpen, setMenuOpen] = useState(false);
  const category = categoryOf(post.category);

  const toggleLike = async () => {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    try {
      const { data } = next ? await postsApi.like(post.id) : await postsApi.unlike(post.id);
      setLikeCount(data.likeCount);
    } catch (err) {
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
      showError(err);
    }
  };

  const remove = () =>
    Alert.alert('Gönderi silinsin mi?', 'Bu işlem geri alınamaz.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await postsApi.remove(post.id);
            queryClient.invalidateQueries({ queryKey: ['posts'] });
            onDeleted?.();
          } catch (err) {
            showError(err);
          }
        },
      },
    ]);

  const menuOptions = post.isMine
    ? [{ label: 'Gönderiyi sil', icon: 'trash-outline', destructive: true, onPress: remove }]
    : [
        { label: 'Gönderiyi şikayet et', icon: 'flag-outline', onPress: () => openReport('POST', post.id) },
        ...(post.author
          ? [{ label: 'Kullanıcıyı engelle', icon: 'ban-outline', destructive: true, onPress: () => confirmBlock(post.author) }]
          : []),
      ];

  // Kartın tamamı değil yalnızca içerik bölümü dokunulabilir: iç içe düğme
  // olmaması ekran okuyucular (VoiceOver/TalkBack) için gereklidir
  const Body = detail ? View : Pressable;
  const bodyProps = detail
    ? {}
    : {
        onPress: () => router.push(`/post/${post.id}`),
        accessibilityRole: 'button',
        accessibilityLabel: `${post.title ? `${post.title}. ` : ''}Gönderiyi aç`,
      };

  return (
    <Card style={[styles.card, detail && styles.detailCard]}>
      <UserLine
        user={post.author}
        meta={timeAgo(post.createdAt)}
        right={<IconButton icon="ellipsis-horizontal" label="Gönderi seçenekleri" onPress={() => setMenuOpen(true)} color={colors.textMuted} size={20} />}
      />

      <Body style={styles.body} {...bodyProps}>
      <View style={styles.tags}>
        <View style={styles.category}>
          <Ionicons name={category.icon} size={13} color={colors.primaryDark} />
          <Text variant="tiny" style={{ color: colors.primaryDark }}>
            {category.label}
          </Text>
        </View>
        <Text variant="tiny" tone="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
          {post.cancerType?.name}
        </Text>
      </View>

      {post.title ? <Text variant="subheading">{post.title}</Text> : null}
      <Text variant="body" numberOfLines={detail ? undefined : 6}>
        {post.content}
      </Text>
      {post.editedAt ? (
        <Text variant="tiny" tone="muted">
          düzenlendi
        </Text>
      ) : null}

      <MediaGrid media={post.media} />
      </Body>

      <View style={styles.actions}>
        <Pressable
          onPress={toggleLike}
          accessibilityRole="button"
          accessibilityLabel={liked ? 'Beğeniyi kaldır' : 'Destek ver'}
          accessibilityState={{ selected: liked }}
          style={styles.action}
        >
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={21} color={liked ? colors.danger : colors.textSecondary} />
          <Text variant="label" tone={liked ? 'danger' : 'secondary'}>
            {likeCount > 0 ? likeCount : 'Destek ver'}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push(`/post/${post.id}`)}
          accessibilityRole="button"
          accessibilityLabel="Yorumlar"
          style={styles.action}
          disabled={detail}
        >
          <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
          <Text variant="label" tone="secondary">
            {post.commentCount > 0 ? post.commentCount : 'Yorum yap'}
          </Text>
        </Pressable>
      </View>

      <ActionSheet visible={menuOpen} onClose={() => setMenuOpen(false)} options={menuOptions} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md, marginHorizontal: spacing.lg },
  body: { gap: spacing.md },
  detailCard: { marginHorizontal: 0, borderRadius: 0, borderWidth: 0, shadowOpacity: 0, elevation: 0 },
  tags: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  category: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  single: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, borderRadius: radius.md, overflow: 'hidden' },
  gridItem: { width: '49.3%', aspectRatio: 1, backgroundColor: colors.surfaceMuted },
  actions: {
    flexDirection: 'row',
    gap: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32 },
});
