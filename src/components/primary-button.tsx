import { ActivityIndicator, Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

// DESIGN.md §Components:
//   primary   -> Arsenal red fill, white text, radius 16, pressed -> #DB0007
//   secondary -> transparent, border #2E3238 (theme border), text primary
export function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: Props) {
  const theme = useTheme();
  const isSecondary = variant === 'secondary';
  const isDisabled = disabled || loading;
  const textColor = isSecondary ? theme.text : Brand.white;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        isSecondary
          ? [styles.secondary, { borderColor: theme.border }]
          : styles.primary,
        pressed && !isDisabled && !isSecondary && styles.primaryPressed,
        pressed && !isDisabled && isSecondary && { backgroundColor: theme.backgroundElement },
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <ThemedText style={[styles.label, { color: textColor }]}>{label}</ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52, // >= 44pt tap target
    borderRadius: Radius.button,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  primary: {
    backgroundColor: Brand.red,
  },
  primaryPressed: {
    backgroundColor: Brand.redPressed,
  },
  secondary: {
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontSize: FontSize.body,
    fontWeight: '700',
  },
});
