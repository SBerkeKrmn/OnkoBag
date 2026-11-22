// Kişi arama (kullanıcı adı veya görünen ad)
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { EmptyState, Header, LoadingView, Screen, TextField } from '../../components/ui';
import UserLine from '../../components/UserLine';
import { usersApi } from '../../api';
import { spacing } from '../../constants/theme';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const results = useQuery({
    queryKey: ['users', 'search', debounced],
    queryFn: async () => (await usersApi.search(debounced)).data,
    enabled: debounced.length >= 2,
  });

  return (
    <Screen padded={false} keyboard header={<Header back title="Kişi ara" />}>
      <View style={styles.search}>
        <TextField icon="search" placeholder="Kullanıcı adı veya ad" value={query} onChangeText={setQuery} autoFocus autoCapitalize="none" autoCorrect={false} />
      </View>
      {debounced.length < 2 ? (
        <EmptyState icon="search-outline" title="Topluluktan birini bul" message="Aramak için en az 2 karakter yaz." />
      ) : results.isLoading ? (
        <LoadingView />
      ) : (
        <FlatList
          data={results.data}
          keyExtractor={(u) => u.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <View style={styles.item}>
              <UserLine user={item} />
            </View>
          )}
          ListEmptyComponent={<EmptyState compact icon="person-outline" title="Sonuç bulunamadı" />}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  item: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
});
