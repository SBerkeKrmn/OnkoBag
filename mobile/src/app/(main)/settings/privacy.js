// Özel mesaj izni
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header, Screen, Text } from '../../../components/ui';
import { usersApi } from '../../../api';
import { useAuth } from '../../../context/AuthContext';
import { showError } from '../../../lib/errors';
import { colors, radius, spacing } from '../../../constants/theme';

const OPTIONS = [
  { value: 'EVERYONE', title: 'Herkes', text: 'Topluluktaki herkes sana özel mesaj başlatabilir.' },
  { value: 'FOLLOWING', title: 'Takip ettiklerim', text: 'Yalnızca senin takip ettiğin kişiler mesaj başlatabilir.' },
  { value: 'NOBODY', title: 'Kimse', text: 'Kimse yeni sohbet başlatamaz. Mevcut sohbetlerin devam eder.' },
];

export default function PrivacyScreen() {
  const { user, setUser } = useAuth();
  const [saving, setSaving] = useState(null);

  const choose = async (value) => {
    if (value === user.dmPermission) return;
    setSaving(value);
    try {
      const { data } = await usersApi.updateMe({ dmPermission: value });
      setUser(data);
    } catch (err) {
      showError(err);
    } finally {
      setSaving(null);
    }
  };

  return (
    <Screen scroll header={<Header back title="Kimler mesaj atabilir" />}>
      <View style={styles.container}>
        {OPTIONS.map((o) => {
          const selected = user.dmPermission === o.value;
          return (
            <Pressable
              key={o.value}
              onPress={() => choose(o.value)}
              disabled={Boolean(saving)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              style={[styles.option, selected && styles.selected]}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="bodyStrong">{o.title}</Text>
                <Text variant="caption" tone="secondary">
                  {o.text}
                </Text>
              </View>
              <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? colors.primary : colors.border} />
            </Pressable>
          );
        })}
        <Text variant="caption" tone="muted">
          Engellediğin kişiler bu ayardan bağımsız olarak sana hiçbir zaman mesaj gönderemez.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md, paddingTop: spacing.md },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
});
