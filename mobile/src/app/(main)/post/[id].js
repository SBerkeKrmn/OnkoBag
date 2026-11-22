// Gönderi detayı ve yorumlar
import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { ActionSheet, EmptyState, ErrorView, Header, KeyboardAwareView, LoadingView, Screen, Text } from '../../../components/ui';
import PostCard from '../../../components/PostCard';
import UserLine from '../../../components/UserLine';
import ChatInput from '../../../components/ChatInput';
import { commentsApi, postsApi } from '../../../api';
import { keys } from '../../../lib/queryClient';
import { displayNameOf, timeAgo } from '../../../lib/format';
import { confirmBlock, openReport } from '../../../lib/actions';
import { showError } from '../../../lib/errors';
import { useAuth } from '../../../context/AuthContext';
import { colors, spacing } from '../../../constants/theme';

function Comment({ comment, onReply, onMenu, isReply = false }) {
  const [liked, setLiked] = useState(comment.likedByMe);
  const [count, setCount] = useState(comment.likeCount);

  if (comment.status !== 'PUBLISHED') {
    return (
      <View style={[styles.comment, isReply && styles.reply]}>
        <Text variant="caption" tone="muted" style={{ fontStyle: 'italic' }}>
          Bu yorum kaldırıldı.
        </Text>
      </View>
    );
  }

  const toggleLike = async () => {
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    try {
      const { data } = next ? await commentsApi.like(comment.id) : await commentsApi.unlike(comment.id);
      setCount(data.likeCount);
    } catch (err) {
      setLiked(!next);
      setCount((c) => c + (next ? -1 : 1));
      showError(err);
    }
  };

  return (
    <View style={[styles.comment, isReply && styles.reply]}>
      <UserLine user={comment.author} meta={timeAgo(comment.createdAt)} size={isReply ? 30 : 36} showBadge={!isReply} />
      <Text variant="body" style={{ marginLeft: isReply ? 42 : 48 }}>
        {comment.content}
      </Text>
      <View style={[styles.commentActions, { marginLeft: isReply ? 42 : 48 }]}>
        <Pressable onPress={toggleLike} accessibilityRole="button" accessibilityLabel="Yorumu beğen" style={styles.commentAction}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={16} color={liked ? colors.danger : colors.textMuted} />
          {count > 0 ? (
            <Text variant="tiny" tone={liked ? 'danger' : 'muted'}>
              {count}
            </Text>
          ) : null}
        </Pressable>
        <Pressable onPress={() => onReply(comment)} accessibilityRole="button" style={styles.commentAction}>
          <Text variant="tiny" tone="muted">
            Yanıtla
          </Text>
        </Pressable>
        <Pressable onPress={() => onMenu(comment)} accessibilityRole="button" accessibilityLabel="Yorum seçenekleri" style={styles.commentAction}>
          <Ionicons name="ellipsis-horizontal" size={16} color={colors.textMuted} />
        </Pressable>
      </View>
      {comment.replies?.map((r) => (
        <Comment key={r.id} comment={r} onReply={() => onReply(comment, r)} onMenu={onMenu} isReply />
      ))}
    </View>
  );
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [replyTo, setReplyTo] = useState(null);
  const [menuFor, setMenuFor] = useState(null);

  const post = useQuery({ queryKey: keys.post(id), queryFn: async () => (await postsApi.get(id)).data });
  const comments = useInfiniteQuery({
    queryKey: keys.comments(id),
    queryFn: ({ pageParam }) => postsApi.comments(id, pageParam),
    initialPageParam: undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: Boolean(post.data),
  });

  const send = async (content) => {
    try {
      await postsApi.addComment(id, { content, parentId: replyTo?.id });
      setReplyTo(null);
      await Promise.all([comments.refetch(), post.refetch()]);
      queryClient.invalidateQueries({ queryKey: ['posts', 'list'] });
      queryClient.invalidateQueries({ queryKey: keys.feed });
      return true;
    } catch (err) {
      showError(err, 'Yorum gönderilemedi');
      return false;
    }
  };

  const deleteComment = (comment) =>
    Alert.alert('Yorum silinsin mi?', undefined, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await commentsApi.remove(comment.id);
            comments.refetch();
            post.refetch();
          } catch (err) {
            showError(err);
          }
        },
      },
    ]);

  if (post.isLoading) return <Screen header={<Header back title="Gönderi" />}><LoadingView /></Screen>;
  if (post.error) {
    return (
      <Screen header={<Header back title="Gönderi" />}>
        {post.error.status === 404 ? (
          <EmptyState icon="eye-off-outline" title="Gönderi bulunamadı" message="Bu gönderi kaldırılmış veya erişimin yok." />
        ) : (
          <ErrorView error={post.error} onRetry={post.refetch} />
        )}
      </Screen>
    );
  }

  const items = comments.data?.pages.flatMap((p) => p.data) ?? [];
  const menuOptions = menuFor
    ? menuFor.isMine
      ? [{ label: 'Yorumu sil', icon: 'trash-outline', destructive: true, onPress: () => deleteComment(menuFor) }]
      : [
          { label: 'Yorumu şikayet et', icon: 'flag-outline', onPress: () => openReport('COMMENT', menuFor.id) },
          ...(menuFor.author
            ? [{ label: 'Kullanıcıyı engelle', icon: 'ban-outline', destructive: true, onPress: () => confirmBlock(menuFor.author, () => comments.refetch()) }]
            : []),
        ]
    : [];

  return (
    <Screen padded={false} edges={['top']} header={<Header back title="Gönderi" />}>
      <KeyboardAwareView>
        <FlatList
          data={items}
          keyExtractor={(c) => c.id}
          ListHeaderComponent={
            <View>
              <PostCard post={post.data} detail onDeleted={() => router.back()} />
              <Text variant="label" tone="secondary" style={styles.commentsTitle}>
                Yorumlar ({post.data.commentCount})
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Comment
              comment={item}
              onReply={(root, child) =>
                setReplyTo({
                  id: root.id,
                  title: `${displayNameOf((child ?? root).author)} kişisine yanıt`,
                  text: (child ?? root).content,
                })
              }
              onMenu={setMenuFor}
            />
          )}
          ListEmptyComponent={
            comments.isLoading ? (
              <LoadingView />
            ) : (
              <Text variant="body" tone="muted" align="center" style={{ padding: spacing.xl }}>
                İlk yorumu sen yaz; küçük bir destek mesajı bile çok şey ifade eder.
              </Text>
            )
          }
          onEndReached={() => comments.hasNextPage && comments.fetchNextPage()}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          keyboardShouldPersistTaps="handled"
        />
        <ChatInput
          placeholder="Yorum yaz…"
          onSend={send}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          disabled={!user?.emailVerified}
          disabledText="Yorum yapmak için e-posta adresini doğrulaman gerekiyor."
        />
      </KeyboardAwareView>
      <ActionSheet visible={Boolean(menuFor)} onClose={() => setMenuFor(null)} options={menuOptions} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  commentsTitle: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    borderTopWidth: 8,
    borderTopColor: colors.surfaceMuted,
  },
  comment: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.xs },
  reply: { paddingHorizontal: 0, paddingLeft: 48, paddingVertical: spacing.sm },
  commentActions: { flexDirection: 'row', gap: spacing.lg, alignItems: 'center' },
  commentAction: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 28 },
});
