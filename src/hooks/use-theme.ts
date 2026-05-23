/**
 * Theme accessor. DESIGN.md mandates DARK as the default base mode.
 * To support a light/system flip later, read `useColorScheme()` here and pick
 * `Colors[scheme]` — the tokens already exist in constants/theme.ts.
 */

import { Colors } from '@/constants/theme';

export function useTheme() {
  return Colors.dark;
}
