import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type Option = { label: string; value: string };

type Props = {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  multiple?: boolean;
};

// Pill selector. Single mode keeps one value; multiple mode toggles many.
export function OptionGroup({ options, selected, onChange, multiple = false }: Props) {
  const theme = useTheme();

  function toggle(value: string) {
    if (multiple) {
      onChange(
        selected.includes(value)
          ? selected.filter((v) => v !== value)
          : [...selected, value],
      );
    } else {
      onChange(selected[0] === value ? [] : [value]);
    }
  }

  return (
    <View style={styles.wrap}>
      {options.map((opt) => {
        const on = selected.includes(opt.value);
        return (
          <Pressable
            key={opt.value}
            onPress={() => toggle(opt.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[
              styles.pill,
              { borderColor: on ? Brand.red : theme.border, backgroundColor: on ? Brand.red : 'transparent' },
            ]}
          >
            <ThemedText type="small" style={{ color: on ? Brand.white : theme.text }}>
              {opt.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  pill: {
    borderWidth: 1.5,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    minHeight: 44,
    justifyContent: 'center',
  },
});
