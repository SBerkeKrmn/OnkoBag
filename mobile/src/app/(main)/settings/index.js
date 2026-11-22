import { Linking, StyleSheet, View } from 'react-native';
import { confirmLogout } from '../../../lib/actions';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Header, Screen, Text } from '../../../components/ui';
import SettingsRow, { SettingsGroup } from '../../../components/SettingsRow';
import { useAuth } from '../../../context/AuthContext';
import { LEGAL_LINKS } from '../../../constants/legal';
import { SUPPORT_EMAIL } from '../../../constants/config';
import { spacing } from '../../../constants/theme';

const DM_LABELS = { EVERYONE: 'Herkes', FOLLOWING: 'Takip ettiklerim', NOBODY: 'Kimse' };

export default function SettingsScreen() {
  const { user, logout } = useAuth();

  return (
    <Screen scroll header={<Header back title="Ayarlar" />}>
      <View style={styles.container}>
        <SettingsGroup title="Hesap">
          <SettingsRow icon="person-outline" label="Profili düzenle" onPress={() => router.push('/settings/edit-profile')} />
          <SettingsRow icon="ribbon-outline" label="Kanser profillerim" onPress={() => router.push('/settings/cancer-profiles')} />
          <SettingsRow
            icon="mail-outline"
            label="E-posta"
            value={user?.emailVerified ? 'Doğrulandı' : 'Doğrulanmadı'}
            onPress={user?.emailVerified ? undefined : () => router.push('/verify-email')}
          />
          {user?.linkedProviders?.length ? (
            <SettingsRow
              icon="link-outline"
              label="Bağlı hesaplar"
              value={user.linkedProviders.map((p) => (p === 'GOOGLE' ? 'Google' : 'Apple')).join(', ')}
            />
          ) : null}
          {user?.hasPassword ? (
            <SettingsRow icon="key-outline" label="Şifre değiştir" onPress={() => router.push('/settings/change-password')} last />
          ) : (
            // Google/Apple ile kayıt olanlar e-posta kodu ile şifre belirleyebilir
            <SettingsRow icon="key-outline" label="Şifre belirle" onPress={() => router.push('/forgot-password')} last />
          )}
        </SettingsGroup>

        <SettingsGroup title="Gizlilik ve güvenlik">
          <SettingsRow
            icon="chatbubble-ellipses-outline"
            label="Kimler mesaj atabilir"
            value={DM_LABELS[user?.dmPermission]}
            onPress={() => router.push('/settings/privacy')}
          />
          <SettingsRow icon="ban-outline" label="Engellenen kullanıcılar" onPress={() => router.push('/settings/blocked')} last />
        </SettingsGroup>

        <SettingsGroup title="Destek ve yasal">
          {LEGAL_LINKS.map((l) => (
            <SettingsRow key={l.key} icon={l.icon} label={l.label} onPress={() => router.push(`/legal/${l.key}`)} />
          ))}
          <SettingsRow
            icon="help-buoy-outline"
            label="Destek ile iletişime geç"
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=OnkoBağ destek`)}
            last
          />
        </SettingsGroup>

        <SettingsGroup>
          <SettingsRow icon="log-out-outline" label="Çıkış yap" onPress={() => confirmLogout(logout)} />
          <SettingsRow icon="trash-outline" label="Hesabımı sil" destructive onPress={() => router.push('/settings/delete-account')} last />
        </SettingsGroup>

        <Text variant="tiny" tone="muted" align="center">
          OnkoBağ {Constants.expoConfig?.version} · {SUPPORT_EMAIL}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ container: { gap: spacing.xl, paddingTop: spacing.md } });
