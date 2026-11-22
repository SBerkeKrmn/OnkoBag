// Kullanıcı yönetimi: arama, uyarı, askıya alma, rol (rol yalnızca yönetici)
import { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ActionSheet, Avatar, Chip, EmptyState, ErrorView, Header, LoadingView, Screen, Text, TextField } from '../../../components/ui';
import ReasonDialog from '../../../components/ReasonDialog';
import { adminApi } from '../../../api';
import { useAuth } from '../../../context/AuthContext';
import { confirmAction } from '../../../lib/actions';
import { showError } from '../../../lib/errors';
import { displayNameOf } from '../../../lib/format';
import { HIDE_PRESETS, ROLE_LABELS, SUSPEND_DURATIONS, USER_STATUS_LABELS, WARN_PRESETS } from '../../../lib/moderation';
import { colors, radius, spacing } from '../../../constants/theme';

const FILTERS = [
  { label: 'Tümü', params: {} },
  { label: 'Askıda', params: { status: 'SUSPENDED' } },
  { label: 'Moderatörler', params: { role: 'MODERATOR' } },
  { label: 'Yöneticiler', params: { role: 'ADMIN' } },
];

function useDebounced(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function UsersScreen() {
  const { user: me } = useAuth();
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState(FILTERS[0]);
  const [selected, setSelected] = useState(null);
  const [dialog, setDialog] = useState(null);
  const query = useDebounced(q.trim());
  const isAdmin = me?.role === 'ADMIN';

  const users = useQuery({
    queryKey: ['admin', 'users', query, filter.label],
    queryFn: async () => (await adminApi.users({ q: query || undefined, ...filter.params, limit: 50 })).data,
  });

  const run = async (fn) => {
    try {
      await fn();
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      return true;
    } catch (err) {
      showError(err, 'İşlem yapılamadı');
      return false;
    }
  };

  const optionsFor = (u) => {
    if (!u || u.id === me?.id) return u ? [{ label: 'Profili aç', icon: 'person-outline', onPress: () => router.push(`/user/${u.id}`) }] : [];
    const opts = [{ label: 'Profili aç', icon: 'person-outline', onPress: () => router.push(`/user/${u.id}`) }];
    // Moderatörler yalnızca normal kullanıcılar üzerinde işlem yapabilir (backend de denetler)
    const canManage = isAdmin || u.role === 'USER';
    if (canManage && u.status !== 'DELETED') {
      opts.push({
        label: 'Uyarı gönder',
        icon: 'alert-circle-outline',
        onPress: () =>
          setDialog({
            title: `@${u.username} uyarılsın mı?`,
            message: 'Gerekçe kullanıcıya bildirim olarak iletilir.',
            confirmText: 'Uyar',
            presets: WARN_PRESETS,
            onConfirm: ({ reason }) => run(() => adminApi.warn(u.id, { reason })),
          }),
      });
      if (u.status === 'SUSPENDED') {
        opts.push({
          label: 'Askıyı kaldır',
          icon: 'lock-open-outline',
          onPress: () => confirmAction({ title: `@${u.username} için askı kaldırılsın mı?`, confirmText: 'Kaldır', onConfirm: () => run(() => adminApi.unsuspend(u.id, {})) }),
        });
      } else {
        opts.push({
          label: 'Askıya al',
          icon: 'ban-outline',
          destructive: true,
          onPress: () =>
            setDialog({
              title: `@${u.username} askıya alınsın mı?`,
              message: 'Oturumları kapatılır ve süre bitene kadar giriş yapamaz.',
              confirmText: 'Askıya al',
              destructive: true,
              durations: SUSPEND_DURATIONS,
              presets: HIDE_PRESETS,
              onConfirm: ({ reason, until }) => run(() => adminApi.suspend(u.id, { reason, until })),
            }),
        });
      }
    }
    if (isAdmin && u.status !== 'DELETED') {
      Object.keys(ROLE_LABELS)
        .filter((role) => role !== u.role)
        .forEach((role) =>
          opts.push({
            label: `Rolü "${ROLE_LABELS[role]}" yap`,
            icon: 'shield-half-outline',
            onPress: () =>
              confirmAction({
                title: `@${u.username} rolü değiştirilsin mi?`,
                message: `${ROLE_LABELS[u.role]} → ${ROLE_LABELS[role]}`,
                confirmText: 'Değiştir',
                onConfirm: () => run(() => adminApi.changeRole(u.id, role)),
              }),
          }),
        );
    }
    return opts;
  };

  let empty;
  if (users.isLoading) empty = <LoadingView />;
  else if (users.error) empty = <ErrorView error={users.error} onRetry={users.refetch} />;
  else empty = <EmptyState compact icon="people-outline" title="Kullanıcı bulunamadı" />;

  return (
    <Screen padded={false} keyboard header={<Header back title="Kullanıcılar" />}>
      <FlatList
        data={users.data ?? []}
        keyExtractor={(u) => u.id}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={{ gap: spacing.sm, paddingBottom: spacing.md }}>
            <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
              <TextField
                icon="search-outline"
                placeholder={isAdmin ? 'Kullanıcı adı, ad veya e-posta' : 'Kullanıcı adı veya ad'}
                value={q}
                onChangeText={setQ}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {FILTERS.map((f) => (
                <Chip key={f.label} label={f.label} selected={filter.label === f.label} onPress={() => setFilter(f)} />
              ))}
            </ScrollView>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setSelected(item)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceMuted }]}
          >
            <Avatar user={item} size={42} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {displayNameOf(item)} <Text variant="caption" tone="muted">@{item.username}</Text>
              </Text>
              {item.email ? (
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {item.email}
                </Text>
              ) : null}
              <View style={styles.tags}>
                {item.role !== 'USER' ? <Tag text={ROLE_LABELS[item.role]} color={colors.primary} /> : null}
                {item.status !== 'ACTIVE' ? <Tag text={USER_STATUS_LABELS[item.status]} color={colors.danger} /> : null}
                {item.reportCount ? <Tag text={`${item.reportCount} şikayet`} color={colors.warning} /> : null}
                {!item.emailVerifiedAt ? <Tag text="E-posta doğrulanmadı" color={colors.textMuted} /> : null}
              </View>
            </View>
            <Ionicons name="ellipsis-horizontal" size={18} color={colors.textMuted} />
          </Pressable>
        )}
        ListEmptyComponent={empty}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        refreshControl={<RefreshControl refreshing={users.isRefetching} onRefresh={users.refetch} tintColor={colors.primary} />}
      />
      <ActionSheet
        visible={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `@${selected.username}` : undefined}
        options={optionsFor(selected)}
      />
      <ReasonDialog dialog={dialog} onClose={() => setDialog(null)} />
    </Screen>
  );
}

function Tag({ text, color }) {
  return (
    <View style={[styles.tag, { borderColor: color }]}>
      <Text variant="tiny" style={{ color }}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  tag: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 6, paddingVertical: 1 },
});
