import { forwardRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from './Text';
import { colors, fonts, fontSize, radius, spacing, hitSlop } from '../../constants/theme';

const TextField = forwardRef(function TextField(
  { label, error, helper, icon, secure = false, multiline = false, style, inputStyle, maxLength, value, ...props },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secure);

  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;

  return (
    <View style={[styles.wrapper, style]}>
      {label ? (
        <Text variant="label" tone="secondary" style={styles.label}>
          {label}
        </Text>
      ) : null}

      <View style={[styles.field, multiline && styles.multilineField, { borderColor }, focused && styles.focused]}>
        {icon ? <Ionicons name={icon} size={20} color={focused ? colors.primary : colors.textMuted} /> : null}
        <TextInput
          ref={ref}
          value={value}
          style={[styles.input, multiline && styles.multilineInput, inputStyle]}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={hidden}
          multiline={multiline}
          maxLength={maxLength}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          accessibilityLabel={label ?? props.placeholder}
          {...props}
        />
        {secure ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={hitSlop}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Şifreyi göster' : 'Şifreyi gizle'}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text variant="caption" tone="danger" style={styles.message}>
          {error}
        </Text>
      ) : helper || maxLength ? (
        <View style={styles.helperRow}>
          <Text variant="caption" tone="muted" style={{ flex: 1 }}>
            {helper ?? ''}
          </Text>
          {maxLength && multiline ? (
            <Text variant="tiny" tone="muted">
              {(value ?? '').length}/{maxLength}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
});

export default TextField;

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  label: { marginLeft: spacing.xs },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
  },
  focused: { backgroundColor: '#FDFCFF' },
  multilineField: { alignItems: 'flex-start', paddingVertical: spacing.md },
  input: {
    flex: 1,
    // Web önizlemesinde tarayıcı odak çerçevesini kapat (odak, kenarlık rengiyle gösteriliyor)
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
    fontFamily: fonts.medium,
    fontSize: fontSize.md,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  multilineInput: { minHeight: 110, textAlignVertical: 'top', paddingVertical: 0 },
  message: { marginLeft: spacing.xs },
  helperRow: { flexDirection: 'row', marginHorizontal: spacing.xs, gap: spacing.sm },
});
