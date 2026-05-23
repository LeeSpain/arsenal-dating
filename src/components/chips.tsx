import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  max?: number;
};

// Free-text multi-add (e.g. favourite players), with optional tappable suggestions.
export function Chips({ values, onChange, placeholder, suggestions = [], max = 10 }: Props) {
  const theme = useTheme();
  const [text, setText] = useState('');

  function add(raw: string) {
    const v = raw.trim();
    if (!v || values.length >= max) return;
    if (values.some((x) => x.toLowerCase() === v.toLowerCase())) return;
    onChange([...values, v]);
    setText('');
  }
  function remove(v: string) {
    onChange(values.filter((x) => x !== v));
  }

  const remaining = suggestions.filter(
    (s) => !values.some((v) => v.toLowerCase() === s.toLowerCase()),
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.input}>
          <TextField
            value={text}
            onChangeText={setText}
            placeholder={placeholder}
            onSubmitEditing={() => add(text)}
            returnKeyType="done"
          />
        </View>
        <PrimaryButton label="Add" variant="secondary" onPress={() => add(text)} style={styles.addBtn} />
      </View>

      {values.length > 0 && (
        <View style={styles.chipRow}>
          {values.map((v) => (
            <Pressable
              key={v}
              onPress={() => remove(v)}
              accessibilityLabel={`Remove ${v}`}
              style={[styles.chip, { backgroundColor: Brand.red }]}
            >
              <ThemedText type="small" style={{ color: Brand.white }}>
                {v}　✕
              </ThemedText>
            </Pressable>
          ))}
        </View>
      )}

      {remaining.length > 0 && (
        <View style={styles.chipRow}>
          {remaining.map((s) => (
            <Pressable
              key={s}
              onPress={() => add(s)}
              style={[styles.chip, { borderWidth: 1.5, borderColor: theme.border }]}
            >
              <ThemedText type="small" themeColor="textSecondary">
                + {s}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.one },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  input: { flex: 1 },
  addBtn: { alignSelf: 'auto', paddingHorizontal: Spacing.two },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  chip: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    minHeight: 36,
    justifyContent: 'center',
  },
});
