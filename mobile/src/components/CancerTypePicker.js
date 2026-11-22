// Kanser türü seçici: aranabilir liste (kayıt ve profil ekleme ekranlarında)
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { cancerTypesApi } from '../api';
import { keys } from '../lib/queryClient';
import { Text, TextField, LoadingView, ErrorView } from './ui';
import { colors, radius, spacing } from '../constants/theme';

const normalize = (s) => s.toLocaleLowerCase('tr-TR');

export default function CancerTypePicker({ value, onChange, excludeIds = [] }) {
  const [query, setQuery] = useState('');
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: keys.cancerTypes,
    queryFn: async () => (await cancerTypesApi.list()).data,
    staleTime: 10 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    const list = (data ?? []).filter((c) => !excludeIds.includes(c.id));
    if (!query.trim()) return list;
    return list.filter((c) => normalize(c.name).includes(normalize(query.trim())));
  }, [data, query, excludeIds]);

  if (isLoading) return <LoadingView />;
  if (error) return <ErrorView error={error} onRetry={refetch} />;

  return (
    <View style={{ gap: spacing.md }}>
      <TextField icon="search" placeholder="Kanser türü ara" value={query} onChangeText={setQuery} autoCorrect={false} />
      <View style={styles.list}>
        {filtered.map((c) => {
          const selected = c.id === value;
          return (
            <Pressable
              key={c.id}
              onPress={() => onChange(c)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              style={({ pressed }) => [styles.item, selected && styles.selected, pressed && { opacity: 0.85 }]}
            >
              <Text variant={selected ? 'bodyStrong' : 'body'} style={{ flex: 1 }}>
                {c.name}
              </Text>
              <Ionicons
                name={selected ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={selected ? colors.primary : colors.border}
              />
            </Pressable>
          );
        })}
        {filtered.length === 0 ? (
          <Text variant="caption" tone="muted" align="center" style={{ padding: spacing.lg }}>
            Sonuç bulunamadı. Listede yoksa “Diğer Kanser Türleri”ni seçebilirsin.
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
});
