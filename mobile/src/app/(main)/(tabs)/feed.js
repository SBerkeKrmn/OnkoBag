// Akış: "Sana özel" (toplulukların + takip ettiklerin) ve "Keşfet" (tüm topluluklar)
import { useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Banner, Chip, EmptyState, ErrorView, Header, IconButton, LoadingView, Screen } from '../../../components/ui';
import PostCard from '../../../components/PostCard';
import SegmentedControl from '../../../components/SegmentedControl';
import SuggestionsStrip from '../../../components/SuggestionsStrip';
import { LogoMark } from '../../../components/Logo';
import { cancerTypesApi, notificationsApi, postsApi } from '../../../api';
import { keys } from '../../../lib/queryClient';
import { POST_CATEGORIES } from '../../../lib/format';
import { useAuth } from '../../../context/AuthContext';
import { colors, spacing } from '../../../constants/theme';

function usePosts(mode, filters) {
  return useInfiniteQuery({
    queryKey: mode === 'feed' ? keys.feed : keys.posts(filters),
    queryFn: ({ pageParam }) => (mode === 'feed' ? postsApi.feed(pageParam) : postsApi.list({ ...filters, cursor: pageParam })),
    initialPageParam: undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export default function FeedScreen() {
  const { user } = useAuth();
  const [mode, setMode] = useState('feed');
  const [cancerTypeId, setCancerTypeId] = useState(null);
  const [category, setCategory] = useState(null);

  const posts = usePosts(mode, { cancerTypeId: cancerTypeId ?? undefined, category: category ?? undefined });
  const cancerTypes = useQuery({
    queryKey: keys.cancerTypes,
    queryFn: async () => (await cancerTypesApi.list()).data,
    staleTime: 10 * 60 * 1000,
  });
  const unread = useQuery({
    queryKey: keys.unreadCount,
    queryFn: async () => (await notificationsApi.unreadCount()).data.count,
  });

  const primaryStatus = user?.cancerProfiles?.[0]?.status;
  const items = posts.data?.pages.flatMap((p) => p.data) ?? [];

  const listHeader = (
    <View style={styles.listHeader}>
      <View style={styles.padded}>
        <SegmentedControl
          value={mode}
          onChange={setMode}
          options={[
            { value: 'feed', label: 'Sana özel' },
            { value: 'explore', label: 'Keşfet' },
          ]}
        />
      </View>

      {!user?.emailVerified ? (
        <View style={styles.padded}>
          <Banner
            tone="warning"
            title="E-posta adresini doğrula"
            message="Paylaşım yapmak ve mesaj göndermek için doğrulama gerekiyor."
            actionLabel="Doğrula"
            onPress={() => router.push('/verify-email')}
          />
        </View>
      ) : null}

      {mode === 'feed' ? <SuggestionsStrip myStatus={primaryStatus} /> : null}

      {mode === 'explore' ? (
        <View style={{ gap: spacing.sm }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip label="Tüm topluluklar" selected={!cancerTypeId} onPress={() => setCancerTypeId(null)} />
            {(cancerTypes.data ?? []).map((c) => (
              <Chip key={c.id} label={c.name} selected={cancerTypeId === c.id} onPress={() => setCancerTypeId(c.id)} />
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {POST_CATEGORIES.map((c) => (
              <Chip
                key={c.value}
                label={c.label}
                icon={c.icon}
                selected={category === c.value}
                onPress={() => setCategory(category === c.value ? null : c.value)}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );

  let empty = null;
  if (posts.isLoading) empty = <LoadingView />;
  else if (posts.error) empty = <ErrorView error={posts.error} onRetry={posts.refetch} />;
  else
    empty = (
      <EmptyState
        compact
        icon="sparkles-outline"
        title={mode === 'feed' ? 'Akışın henüz sessiz' : 'Bu toplulukta henüz gönderi yok'}
        message="İlk paylaşımı yaparak sohbeti başlatabilirsin."
        actionLabel="Gönderi paylaş"
        onAction={() => router.push('/post/new')}
      />
    );

  return (
    <Screen
      padded={false}
      edges={['top']}
      header={
        <Header
          large
          title="OnkoBağ"
          left={<LogoMark size={30} />}
          right={
            <>
              <IconButton icon="search-outline" label="Kişi ara" onPress={() => router.push('/search')} />
              <IconButton
                icon="notifications-outline"
                label="Bildirimler"
                badge={unread.data || undefined}
                onPress={() => router.push('/notifications')}
              />
            </>
          }
        />
      }
    >
      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <PostCard post={item} />}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={empty}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        onEndReached={() => posts.hasNextPage && !posts.isFetchingNextPage && posts.fetchNextPage()}
        onEndReachedThreshold={0.4}
        ListFooterComponent={posts.isFetchingNextPage ? <LoadingView /> : null}
        refreshControl={
          <RefreshControl
            refreshing={posts.isRefetching && !posts.isFetchingNextPage}
            onRefresh={() => {
              posts.refetch();
              unread.refetch();
            }}
            tintColor={colors.primary}
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  listHeader: { gap: spacing.lg, paddingBottom: spacing.lg },
  padded: { paddingHorizontal: spacing.lg },
  chips: { paddingHorizontal: spacing.lg, gap: spacing.sm },
});
