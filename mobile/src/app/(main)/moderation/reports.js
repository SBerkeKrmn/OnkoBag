// Şikayet kuyruğu: duruma göre filtrelenir, her şikayete dokununca işlemler açılır
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { ActionSheet, Chip, EmptyState, ErrorView, Header, LoadingView, Screen, Text } from '../../../components/ui';
import ReasonDialog from '../../../components/ReasonDialog';
import { adminApi } from '../../../api';
import { timeAgo } from '../../../lib/format';
import { showError } from '../../../lib/errors';
import { useSocketEvent } from '../../../context/SocketContext';
import {
  HIDE_PRESETS,
  REPORT_STATUSES,
  SUSPEND_DURATIONS,
  TARGET_TYPES,
  WARN_PRESETS,
  reasonOf,
} from '../../../lib/moderation';
import { colors, radius, spacing } from '../../../constants/theme';

const STATUS_TONE = {
  PENDING: { bg: colors.warningLight, fg: colors.warning },
  IN_REVIEW: { bg: colors.infoLight, fg: colors.info },
  RESOLVED: { bg: colors.survivorLight, fg: colors.survivor },
  DISMISSED: { bg: colors.surfaceMuted, fg: colors.textMuted },
};

const CONTENT_STATUS = { PUBLISHED: 'Yayında', HIDDEN: 'Gizlendi', DELETED: 'Silinmiş', ACTIVE: 'Aktif', SUSPENDED: 'Askıda' };

function ReportCard({ report, onPress }) {
  const reason = reasonOf(report.reason);
  const type = TARGET_TYPES[report.targetType];
  const status = REPORT_STATUSES.find((s) => s.value === report.status);
  const tone = STATUS_TONE[report.status];
  const urgent = report.reason === 'SELF_HARM' && ['PENDING', 'IN_REVIEW'].includes(report.status);
  const t = report.target ?? {};

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${reason.label} şikayeti, ${type.label}`}
      style={({ pressed }) => [styles.card, urgent && styles.urgent, pressed && { opacity: 0.9 }]}
    >
      <View style={styles.row}>
        <Ionicons name={reason.icon} size={18} color={urgent ? colors.danger : colors.primary} />
        <Text variant="bodyStrong" style={{ flex: 1 }} tone={urgent ? 'danger' : 'default'}>
          {reason.label}
        </Text>
        <View style={[styles.pill, { backgroundColor: tone.bg }]}>
          <Text variant="tiny" style={{ color: tone.fg }}>
            {status?.label}
          </Text>
        </View>
      </View>

      <View style={styles.row}>
        <Ionicons name={type.icon} size={14} color={colors.textMuted} />
        <Text variant="caption" tone="muted" style={{ flex: 1 }} numberOfLines={1}>
          {type.label}
          {t.owner ? ` · @${t.owner.username}` : ''}
          {t.exists && t.status ? ` · ${CONTENT_STATUS[t.status] ?? t.status}` : ''}
          {t.exists === false ? ' · içerik bulunamadı' : ''}
        </Text>
        <Text variant="tiny" tone="muted">
          {timeAgo(report.createdAt)}
        </Text>
      </View>

      {t.text ? (
        <View style={styles.quote}>
          <Text variant="body" numberOfLines={4}>
            {t.text}
          </Text>
        </View>
      ) : null}

      {report.description ? (
        <Text variant="caption" tone="secondary">
          Şikayet notu: {report.description}
        </Text>
      ) : null}

      <Text variant="tiny" tone="muted">
        Şikayet eden: {report.reporter ? `@${report.reporter.username}` : 'silinmiş kullanıcı'}
        {report.reviewedBy ? ` · İnceleyen: @${report.reviewedBy.username}` : ''}
      </Text>
      {report.resolutionNote ? (
        <Text variant="tiny" tone="muted">
          Sonuç notu: {report.resolutionNote}
        </Text>
      ) : null}
    </Pressable>
  );
}

export default function ReportsScreen() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('PENDING');
  const [selected, setSelected] = useState(null);
  const [dialog, setDialog] = useState(null);

  const reports = useInfiniteQuery({
    queryKey: ['admin', 'reports', status],
    queryFn: ({ pageParam }) => adminApi.reports({ status, cursor: pageParam }),
    initialPageParam: undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  useSocketEvent('moderation:urgent-report', () => reports.refetch());

  const items = reports.data?.pages.flatMap((p) => p.data) ?? [];
  const refreshAll = () => queryClient.invalidateQueries({ queryKey: ['admin'] });

  // İşlemi çalıştırır; başarıda listeyi tazeler. ReasonDialog false dönüşte açık kalır.
  const run = async (fn) => {
    try {
      await fn();
      refreshAll();
      return true;
    } catch (err) {
      showError(err, 'İşlem yapılamadı');
      return false;
    }
  };

  const optionsFor = (r) => {
    if (!r) return [];
    const t = r.target ?? {};
    const open = ['PENDING', 'IN_REVIEW'].includes(r.status);
    const isContent = r.targetType !== 'USER';
    const ownerId = r.targetType === 'USER' ? r.targetId : t.owner?.id;
    const opts = [];

    if (t.exists) {
      if (r.targetType === 'POST') opts.push({ label: 'Gönderiyi aç', icon: 'open-outline', onPress: () => router.push(`/post/${r.targetId}`) });
      if (r.targetType === 'COMMENT' && t.postId) opts.push({ label: 'Gönderiyi aç', icon: 'open-outline', onPress: () => router.push(`/post/${t.postId}`) });
      if (r.targetType === 'USER') opts.push({ label: 'Profili aç', icon: 'person-outline', onPress: () => router.push(`/user/${r.targetId}`) });
    }

    if (open && r.status === 'PENDING') {
      opts.push({
        label: 'İncelemeye al',
        icon: 'eye-outline',
        onPress: () => run(() => adminApi.updateReport(r.id, { status: 'IN_REVIEW' })),
      });
    }

    if (isContent && t.status === 'PUBLISHED') {
      opts.push({
        label: 'İçeriği gizle',
        icon: 'eye-off-outline',
        destructive: true,
        onPress: () =>
          setDialog({
            title: 'İçerik gizlensin mi?',
            message: 'İçerik herkesten gizlenir ve şikayet çözüldü olarak işaretlenir. Gerekirse geri yükleyebilirsin.',
            confirmText: 'Gizle',
            destructive: true,
            presets: HIDE_PRESETS,
            onConfirm: ({ reason }) =>
              run(() => adminApi.hideContent(r.targetType, r.targetId, { reason, ...(open ? { reportId: r.id } : {}) })),
          }),
      });
    }
    if (isContent && t.status === 'HIDDEN') {
      opts.push({
        label: 'İçeriği geri yükle',
        icon: 'refresh-outline',
        onPress: () =>
          setDialog({
            title: 'İçerik geri yüklensin mi?',
            confirmText: 'Geri yükle',
            presets: ['Kurallara aykırı değil', 'Yanlışlıkla gizlendi'],
            onConfirm: ({ reason }) => run(() => adminApi.restoreContent(r.targetType, r.targetId, { reason })),
          }),
      });
    }

    if (ownerId && t.owner?.status !== 'DELETED') {
      opts.push({
        label: 'Kullanıcıyı uyar',
        icon: 'alert-circle-outline',
        onPress: () =>
          setDialog({
            title: 'Kullanıcıya uyarı gönder',
            message: 'Gerekçe kullanıcıya bildirim olarak iletilir.',
            confirmText: 'Uyar',
            presets: WARN_PRESETS,
            onConfirm: ({ reason }) => run(() => adminApi.warn(ownerId, { reason, ...(open ? { reportId: r.id } : {}) })),
          }),
      });
      if (t.owner?.status !== 'SUSPENDED') {
        opts.push({
          label: 'Kullanıcıyı askıya al',
          icon: 'ban-outline',
          destructive: true,
          onPress: () =>
            setDialog({
              title: 'Kullanıcı askıya alınsın mı?',
              message: 'Kullanıcının oturumları kapatılır ve süre bitene kadar giriş yapamaz.',
              confirmText: 'Askıya al',
              destructive: true,
              durations: SUSPEND_DURATIONS,
              presets: HIDE_PRESETS,
              onConfirm: ({ reason, until }) =>
                run(() => adminApi.suspend(ownerId, { reason, until, ...(open ? { reportId: r.id } : {}) })),
            }),
        });
      }
    }

    if (open) {
      opts.push(
        {
          label: 'Çözüldü olarak işaretle',
          icon: 'checkmark-circle-outline',
          onPress: () =>
            setDialog({
              title: 'Şikayet çözüldü',
              message: 'Şikayet edene incelendiği bildirilir.',
              confirmText: 'Kaydet',
              presets: ['Gerekli işlem yapıldı', 'Kullanıcıyla iletişime geçildi'],
              onConfirm: ({ reason }) => run(() => adminApi.updateReport(r.id, { status: 'RESOLVED', resolutionNote: reason })),
            }),
        },
        {
          label: 'Şikayeti reddet',
          icon: 'close-circle-outline',
          onPress: () =>
            setDialog({
              title: 'Şikayet reddedilsin mi?',
              message: 'İçerik kurallara aykırı değilse şikayeti reddet.',
              confirmText: 'Reddet',
              presets: ['Kurallara aykırı değil', 'Yetersiz bilgi', 'Mükerrer şikayet'],
              onConfirm: ({ reason }) => run(() => adminApi.updateReport(r.id, { status: 'DISMISSED', resolutionNote: reason })),
            }),
        },
      );
    }
    return opts;
  };

  let empty;
  if (reports.isLoading) empty = <LoadingView />;
  else if (reports.error) empty = <ErrorView error={reports.error} onRetry={reports.refetch} />;
  else empty = <EmptyState compact icon="shield-checkmark-outline" title="Bu listede şikayet yok" message="Topluluk şimdilik sakin görünüyor." />;

  return (
    <Screen padded={false} header={<Header back title="Şikayetler" />}>
      <FlatList
        data={items}
        keyExtractor={(r) => r.id}
        ListHeaderComponent={
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {REPORT_STATUSES.map((s) => (
              <Chip key={s.value} label={s.label} selected={status === s.value} onPress={() => setStatus(s.value)} />
            ))}
          </ScrollView>
        }
        renderItem={({ item }) => <ReportCard report={item} onPress={() => setSelected(item)} />}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListEmptyComponent={empty}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        onEndReached={() => reports.hasNextPage && !reports.isFetchingNextPage && reports.fetchNextPage()}
        refreshControl={<RefreshControl refreshing={reports.isRefetching} onRefresh={reports.refetch} tintColor={colors.primary} />}
      />
      <ActionSheet
        visible={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `${reasonOf(selected.reason).label} · ${TARGET_TYPES[selected.targetType].label}` : undefined}
        options={optionsFor(selected)}
      />
      <ReasonDialog dialog={dialog} onClose={() => setDialog(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  card: {
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  urgent: { borderColor: colors.danger, borderWidth: 1.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pill: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill },
  quote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primaryMuted,
    paddingLeft: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
  },
});
