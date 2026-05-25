import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { FontFamily, FontSize, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextType =
  | 'default'
  | 'hero'
  | 'title'
  | 'section'
  | 'subtitle'
  | 'small'
  | 'smallBold'
  | 'link'
  | 'linkPrimary'
  | 'code';

export type ThemedTextProps = TextProps & {
  type?: ThemedTextType;
  themeColor?: ThemeColor;
};

// Map a fontWeight to the matching Inter family. With expo-google-fonts each
// weight is its own family, so fontWeight alone won't bold on native — we
// resolve the right family here so existing screens that pass fontWeight still
// get a real weight (and web doesn't faux-bold).
function interByWeight(w: TextStyle['fontWeight']): string {
  switch (String(w)) {
    case '500':
      return FontFamily.bodyMedium;
    case '600':
      return FontFamily.bodySemibold;
    case '700':
    case '800':
    case '900':
    case 'bold':
      return FontFamily.bodyBold;
    default:
      return FontFamily.body; // 100–400 / normal
  }
}

// Base style per type (plain objects so we can read fontFamily below).
// Headlines use Archivo (display); body/UI use Inter — DESIGN.md §Typography.
const TYPE: Record<ThemedTextType, TextStyle> = {
  default: { fontFamily: FontFamily.body, fontSize: FontSize.body, lineHeight: 24 },
  small: { fontFamily: FontFamily.bodyMedium, fontSize: 14, lineHeight: 20 },
  smallBold: { fontFamily: FontFamily.bodySemibold, fontSize: 14, lineHeight: 20 },
  hero: { fontFamily: FontFamily.displayHeavy, fontSize: FontSize.hero, lineHeight: 40 },
  title: { fontFamily: FontFamily.display, fontSize: FontSize.title, lineHeight: 30 },
  section: { fontFamily: FontFamily.displaySemibold, fontSize: FontSize.section, lineHeight: 24 },
  subtitle: { fontFamily: FontFamily.body, fontSize: FontSize.section, lineHeight: 26 },
  link: { fontFamily: FontFamily.bodyMedium, fontSize: 14, lineHeight: 20 },
  // Accent + underline so a link never relies on colour alone (DESIGN.md §A11y).
  linkPrimary: {
    fontFamily: FontFamily.bodySemibold,
    fontSize: 14,
    lineHeight: 20,
    textDecorationLine: 'underline',
  },
  code: { fontFamily: 'monospace', fontSize: 12, lineHeight: 18 },
};

const DISPLAY_TYPES = new Set<ThemedTextType>(['hero', 'title', 'section', 'code']);

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const base = TYPE[type];
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;

  // Resolve the font family: an explicit fontFamily wins; otherwise honour an
  // inline fontWeight for body text (display faces keep their own family).
  const fontFamily =
    flat.fontFamily ??
    (!DISPLAY_TYPES.has(type) && flat.fontWeight ? interByWeight(flat.fontWeight) : base.fontFamily);

  const color = type === 'linkPrimary' ? theme.accent : theme[themeColor ?? 'text'];

  return <Text style={[{ color }, base, style, { fontFamily }]} {...rest} />;
}
