// Profil üst bölümü: avatar, ad, kanser profilleri, biyografi, istatistikler
import { StyleSheet, View } from 'react-native';
import { Avatar, StatusBadge, Text } from './ui';
import { displayNameOf } from '../lib/format';
import { colors, radius, spacing } from '../constants/theme';

function Stat({ value, label }) {
  return (
    <View style={styles.stat}>
      <Text variant="heading">{value}</Text>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  );
}

export default function ProfileHeader({ profile, actions }) {
  const primary = profile.cancerProfiles?.find((p) => p.isPrimary) ?? profile.cancerProfiles?.[0];
  const avatarUser = {
    ...profile,
    primaryCancer: primary ? { status: primary.status, isVerified: primary.isVerified, cancerType: primary.cancerType } : null,
  };

  return (
    <View style={styles.container}>
      <View style={styles.cover} />
      <View style={styles.avatarWrap}>
        <Avatar user={avatarUser} size={96} />
      </View>

      <View style={styles.names}>
        <Text variant="title" align="center">
          {displayNameOf(profile)}
        </Text>
        <Text variant="body" tone="muted" align="center">
          @{profile.username}
          {profile.city ? ` · ${profile.city}` : ''}
        </Text>
      </View>

      <View style={styles.badges}>
        {profile.cancerProfiles?.map((p) => (
          <View key={p.id ?? p.cancerType.id} style={{ alignItems: 'center', gap: 2 }}>
            <StatusBadge size="md" status={p.status} isVerified={p.isVerified} cancerTypeName={p.cancerType.name} />
            {p.status === 'SURVIVOR' && p.remissionYear ? (
              <Text variant="tiny" tone="muted">
                {p.remissionYear}’ten beri iyileşmiş
              </Text>
            ) : p.diagnosisYear ? (
              <Text variant="tiny" tone="muted">
                Tanı: {p.diagnosisYear}
              </Text>
            ) : null}
          </View>
        ))}
      </View>

      {profile.bio ? (
        <Text variant="body" tone="secondary" align="center" style={styles.bio}>
          {profile.bio}
        </Text>
      ) : null}

      <View style={styles.stats}>
        <Stat value={profile.stats?.posts ?? 0} label="Gönderi" />
        <View style={styles.divider} />
        <Stat value={profile.stats?.followers ?? 0} label="Takipçi" />
        <View style={styles.divider} />
        <Stat value={profile.stats?.following ?? 0} label="Takip" />
      </View>

      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingBottom: spacing.lg, gap: spacing.md },
  cover: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 74,
    backgroundColor: colors.primaryLight,
  },
  avatarWrap: {
    marginTop: 26,
    padding: 4,
    borderRadius: 60,
    backgroundColor: colors.background,
  },
  names: { gap: 2, paddingHorizontal: spacing.xl },
  badges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  bio: { paddingHorizontal: spacing.xl },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.lg,
    alignSelf: 'stretch',
  },
  stat: { flex: 1, alignItems: 'center' },
  divider: { width: 1, height: 28, backgroundColor: colors.border },
  actions: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, alignSelf: 'stretch' },
});
