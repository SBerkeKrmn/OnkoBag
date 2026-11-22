// Başka bir kullanıcının profili
import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ActionSheet, Banner, Button, EmptyState, ErrorView, Header, IconButton, LoadingView, Screen, Text } from '../../../components/ui';
import ProfileHeader from '../../../components/ProfileHeader';
import PostCard from '../../../components/PostCard';
import useUserPosts from '../../../hooks/useUserPosts';
import { conversationsApi, usersApi } from '../../../api';
import { keys } from '../../../lib/queryClient';
import { confirmBlock, openReport } from '../../../lib/actions';
import { showError } from '../../../lib/errors';
import { useAuth } from '../../../context/AuthContext';
import { spacing } from '../../../constants/theme';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams();
  const { user: me } = useAuth();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const profile = useQuery({ queryKey: keys.user(id), queryFn: async () => (await usersApi.get(id)).data });
  const posts = useUserPosts(id, Boolean(profile.data));

  if (id === me?.id) return <Redirect href="/profile" />;

  const header = <Header back title="" right={profile.data ? <IconButton icon="ellipsis-horizontal" label="Seçenekler" onPress={() => setMenuOpen(true)} /> : null} />;

  if (profile.isLoading) return <Screen header={header}><LoadingView /></Screen>;
  if (profile.error) {
    return (
      <Screen header={header}>
        {profile.error.status === 404 ? (
          <EmptyState icon="person-remove-outline" title="Kullanıcı bulunamadı" message="Bu hesap silinmiş veya görüntülenemiyor olabilir." />
        ) : (
          <ErrorView error={profile.error} onRetry={profile.refetch} />
        )}
      </Screen>
    );
  }

  const p = profile.data;
  const rel = p.relationship;

  const toggleFollow = async () => {
    setBusy(true);
    try {
      if (rel.isFollowing) await usersApi.unfollow(p.id);
      else await usersApi.follow(p.id);
      await profile.refetch();
      queryClient.invalidateQueries({ queryKey: keys.feed });
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  };

  const message = async () => {
    setBusy(true);
    try {
      const { data } = await conversationsApi.start(p.id);
      router.push(`/conversation/${data.id}`);
    } catch (err) {
      showError(err, 'Sohbet başlatılamadı');
    } finally {
      setBusy(false);
    }
  };

  const items = posts.data?.pages.flatMap((x) => x.data) ?? [];

  return (
    <Screen padded={false} edges={['top']} header={header}>
      <FlatList
        data={items}
        keyExtractor={(x) => x.id}
        renderItem={({ item }) => <PostCard post={item} />}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        onEndReached={() => posts.hasNextPage && posts.fetchNextPage()}
        ListHeaderComponent={
          <View style={{ gap: spacing.lg, paddingBottom: spacing.lg }}>
            <ProfileHeader
              profile={p}
              actions={
                <>
                  <Button
                    title={rel.isFollowing ? 'Takip ediliyor' : rel.followsMe ? 'Sen de takip et' : 'Takip et'}
                    icon={rel.isFollowing ? 'checkmark' : 'person-add-outline'}
                    variant={rel.isFollowing ? 'outline' : 'primary'}
                    size="md"
                    style={{ flex: 1 }}
                    onPress={toggleFollow}
                    disabled={busy}
                  />
                  {rel.canMessage ? (
                    <Button title="Mesaj" icon="mail-outline" variant="secondary" size="md" style={{ flex: 1 }} onPress={message} disabled={busy} />
                  ) : null}
                </>
              }
            />
            {!rel.canMessage ? (
              <View style={{ paddingHorizontal: spacing.lg }}>
                <Banner tone="info" message="Bu kullanıcı yalnızca takip ettiği kişilerden veya hiç kimseden özel mesaj kabul ediyor." />
              </View>
            ) : null}
            <Text variant="label" tone="secondary" style={{ paddingHorizontal: spacing.xl }}>
              Gönderiler
            </Text>
          </View>
        }
        ListEmptyComponent={
          posts.isLoading ? <LoadingView /> : <EmptyState compact icon="document-text-outline" title="Henüz gönderi yok" />
        }
      />

      <ActionSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        options={[
          { label: 'Kullanıcıyı şikayet et', icon: 'flag-outline', onPress: () => openReport('USER', p.id) },
          { label: 'Engelle', icon: 'ban-outline', destructive: true, onPress: () => confirmBlock(p, () => router.back()) },
        ]}
      />
    </Screen>
  );
}
