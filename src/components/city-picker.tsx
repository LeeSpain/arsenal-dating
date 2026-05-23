import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

export type City = { name: string; country: string; lat: number; lng: number };

type Props = {
  value: City | null;
  onSelect: (c: City) => void;
};

// Autocomplete backed by the seeded `cities` table. We store the chosen city's
// CENTRE coordinates on the profile — coarse, city-level only.
export function CityPicker({ value, onSelect }: Props) {
  const theme = useTheme();
  const [query, setQuery] = useState(value?.name ?? '');
  const [results, setResults] = useState<City[]>([]);
  const [open, setOpen] = useState(false);

  async function onChange(text: string) {
    setQuery(text);
    setOpen(true);
    if (text.trim().length < 2) {
      setResults([]);
      return;
    }
    const { data } = await supabase
      .from('cities')
      .select('name, country, lat, lng')
      .ilike('name', `${text.trim()}%`)
      .order('name')
      .limit(8);
    setResults((data ?? []) as City[]);
  }

  function pick(c: City) {
    onSelect(c);
    setQuery(c.name);
    setResults([]);
    setOpen(false);
  }

  return (
    <View>
      <TextField
        label="City"
        value={query}
        onChangeText={onChange}
        placeholder="Start typing your city"
        autoCorrect={false}
      />
      {open && results.length > 0 ? (
        <ThemedView type="backgroundElement" style={[styles.dropdown, { borderColor: theme.border }]}>
          {results.map((c) => (
            <Pressable key={`${c.name}-${c.country}`} onPress={() => pick(c)} style={styles.row}>
              <ThemedText>{c.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {c.country}
              </ThemedText>
            </Pressable>
          ))}
        </ThemedView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dropdown: {
    borderWidth: 1,
    borderRadius: Radius.input,
    marginTop: Spacing.half,
    overflow: 'hidden',
  },
  row: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
