import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Header, Screen, Text, EmptyState } from '../../components/ui';
import { LEGAL_DOCS } from '../../constants/legal';
import { spacing } from '../../constants/theme';

export default function LegalScreen() {
  const { doc } = useLocalSearchParams();
  const content = LEGAL_DOCS[doc];

  if (!content) {
    return (
      <Screen header={<Header back title="Belge" />}>
        <EmptyState icon="document-outline" title="Belge bulunamadı" />
      </Screen>
    );
  }

  return (
    <Screen scroll header={<Header back title={content.title} />}>
      <Text variant="caption" tone="muted" style={styles.updated}>
        Son güncelleme: {content.updated}
      </Text>
      {content.sections.map((s) => (
        <View key={s.heading} style={styles.section}>
          <Text variant="subheading">{s.heading}</Text>
          <Text variant="body" tone="secondary">
            {s.body}
          </Text>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  updated: { marginBottom: spacing.lg },
  section: { gap: spacing.sm, marginBottom: spacing.xl },
});
