import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  checked: boolean;
  onChange: (next: boolean) => void;
  children: ReactNode;
};

// Consent checkbox — unticked by default (DESIGN.md: no dark patterns).
export function Checkbox({ checked, onChange, children }: Props) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={styles.row}
      hitSlop={8}
    >
      <View
        style={[
          styles.box,
          {
            borderColor: checked ? Brand.red : theme.border,
            backgroundColor: checked ? Brand.red : 'transparent',
          },
        ]}
      >
        {checked ? <ThemedText style={styles.tick}>✓</ThemedText> : null}
      </View>
      <View style={styles.label}>{children}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.one,
    minHeight: 44, // accessible tap target
    paddingVertical: Spacing.half,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  tick: {
    color: Brand.white,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 18,
  },
  label: {
    flex: 1,
  },
});
