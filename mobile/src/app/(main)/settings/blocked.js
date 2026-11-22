import { FlatList, StyleSheet, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, EmptyState, ErrorView, Header, LoadingView, Screen } from '../../../components/ui';
import UserLine from '../../../components/UserLine';
import { usersApi } from '../../../api';
import { keys } from '../../../lib/queryClient';
import { showError } from '../../../lib/errors';
import { spacing } from '../../../constants/theme';

export default function BlockedUsersScreen() {
  const queryClient = useQueryClient();
  const blocks = useQuery({ queryKey: keys.blocks, queryFn: async () => (await usersApi.blocks()).data });

  const unblock = async (userId) => {
    try {
      await usersApi.unblock(userId);
      await blocks.refetch();
      queryClient.invalidateQueries();
    } catch (err) {
      showError(err);
    }
  };

  return (
    <Screen padded={false} header={<Header back title="Engellenen kullanıcılar" />}>
      {blocks.isLoading ? (
        <LoadingView />
      ) : blocks.error ? (
        <ErrorView error={blocks.error} onRetry={blocks.refetch} />
      ) : (
        <FlatList
          data={blocks.data}
          keyExtractor={(b) => b.user?.id ?? String(b.blockedAt)}
          contentContainerStyle={{ flexGrow: 1 }}
          ListEmptyComponent={<EmptyState icon="shield-checkmark-outline" title="Engellediğin kimse yok" />}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <UserLine
                user={item.user}
                onPress={() => {}}
                right={
                  item.user ? <Button title="Engeli kaldır" size="sm" variant="outline" fullWidth={false} onPress={() => unblock(item.user.id)} /> : null
                }
              />
            </View>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({ item: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md } });
