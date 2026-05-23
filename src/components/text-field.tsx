import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, FontSize, Functional, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = TextInputProps & {
  label?: string;
  error?: string;
};

// DESIGN.md §Components: surface fill, radius 12, clear focus state in red.
export function TextField({ label, error, style, onFocus, onBlur, ...rest }: Props) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error
    ? Functional.error
    : focused
      ? Brand.red
      : theme.border;

  return (
    <View style={styles.wrap}>
      {label ? (
        <ThemedText type="small" style={styles.label}>
          {label}
        </ThemedText>
      ) : null}
      <TextInput
        placeholderTextColor={theme.textSecondary}
        {...rest}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          styles.input,
          { backgroundColor: theme.backgroundElement, color: theme.text, borderColor },
          style,
        ]}
      />
      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
    gap: Spacing.half,
  },
  label: {
    marginLeft: Spacing.half,
  },
  input: {
    minHeight: 52,
    borderRadius: Radius.input,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.two,
    fontSize: FontSize.body,
  },
  error: {
    color: Functional.error,
    fontSize: FontSize.caption,
    marginLeft: Spacing.half,
  },
});
