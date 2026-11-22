import { FlatList, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ErrorView, Header, LoadingView, Screen } from '../../../../components/ui';
import UserLine from '../../../../components/UserLine';
import { roomsApi } from '../../../../api';
import { spacing } from '../../../../constants/theme';

export default function RoomMembersScreen() {
  const { id } = useLocalSearchParams();
  const members = useQuery({ queryKey: ['rooms', 'members', id], queryFn: async () => (await roomsApi.members(id)).data });

  return (
    <Screen padded={false} edges={['top']} header={<Header back title="Oda üyeleri" />}>
      {members.isLoading ? (
        <LoadingView />
      ) : members.error ? (
        <ErrorView error={members.error} onRetry={members.refetch} />
      ) : (
        <FlatList
          data={members.data}
          keyExtractor={(u) => u.id}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <UserLine user={item} />
            </View>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({ item: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md } });
