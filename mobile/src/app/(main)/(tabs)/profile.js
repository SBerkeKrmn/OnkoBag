// Kendi profilim
import { useCallback } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Banner, Button, EmptyState, Header, IconButton, LoadingView, Screen, Text } from '../../../components/ui';
import ProfileHeader from '../../../components/ProfileHeader';
import PostCard from '../../../components/PostCard';
import useUserPosts from '../../../hooks/useUserPosts';
import { useAuth } from '../../../context/AuthContext';
import { confirmLogout } from '../../../lib/actions';
import { colors, spacing } from '../../../constants/theme';

export default function ProfileScreen() {
  const { user, refreshUser, logout } = useAuth();
  const posts = useUserPosts(user?.id);

  // Sekmeye her dönüşte sayaçlar güncel olsun
  useFocusEffect(
    useCallback(() => {
      refreshUser().catch(() => {});
    }, [refreshUser]),
  );

  if (!user) return <LoadingView />;
  const items = posts.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <Screen
      padded={false}
      edges={['top']}
      header={
        <Header
          large
          title="Profilim"
          right={<IconButton icon="settings-outline" label="Ayarlar" onPress={() => router.push('/settings')} />}
        />
      }
    >
      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <PostCard post={item} />}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        ListHeaderComponent={
          <View style={{ gap: spacing.lg, paddingBottom: spacing.lg }}>
            <ProfileHeader
              profile={user}
              actions={
                <>
                  <Button title="Profili düzenle" icon="create-outline" variant="secondary" size="md" style={{ flex: 1 }} onPress={() => router.push('/settings/edit-profile')} />
                  <Button title="Kanser profillerim" icon="ribbon-outline" variant="outline" size="md" style={{ flex: 1 }} onPress={() => router.push('/settings/cancer-profiles')} />
                </>
              }
            />
            {!user.emailVerified ? (
              <View style={{ paddingHorizontal: spacing.lg }}>
                <Banner tone="warning" title="E-posta adresin doğrulanmadı" actionLabel="Şimdi doğrula" onPress={() => router.push('/verify-email')} />
              </View>
            ) : null}
            <Text variant="label" tone="secondary" style={{ paddingHorizontal: spacing.xl }}>
              Gönderilerim
            </Text>
          </View>
        }
        ListEmptyComponent={
          posts.isLoading ? (
            <LoadingView />
          ) : (
            <EmptyState compact icon="create-outline" title="Henüz gönderin yok" message="Deneyimini paylaşmak birine umut olabilir." actionLabel="İlk gönderini paylaş" onAction={() => router.push('/post/new')} />
          )
        }
        ListFooterComponent={
          <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xl }}>
            <Button title="Çıkış yap" icon="log-out-outline" variant="outline" size="md" onPress={() => confirmLogout(logout)} />
          </View>
        }
        onEndReached={() => posts.hasNextPage && posts.fetchNextPage()}
        refreshControl={
          <RefreshControl
            refreshing={posts.isRefetching}
            onRefresh={() => {
              posts.refetch();
              refreshUser();
            }}
            tintColor={colors.primary}
          />
        }
      />
    </Screen>
  );
}
