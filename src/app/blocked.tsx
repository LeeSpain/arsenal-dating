import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { type BlockedProfile, listBlocked, unblock } from '@/lib/safety';
import { PHOTOS_BUCKET, signedUrls } from '@/lib/storage';

export default function Blocked() {
  const [rows, setRows] = useState<(BlockedProfile & { url?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const list = await listBlocked();
    const paths = list.map((b) => b.photoPath).filter(Boolean) as string[];
    const map = await signedUrls(PHOTOS_BUCKET, paths);
    setRows(list.map((b) => ({ ...b, url: b.photoPath ? map[b.photoPath] : undefined })));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onUnblock(blockId: string) {
    setBusy(blockId);
    await unblock(blockId);
    setBusy(null);
    await load();
  }

  if (loading) {
    return (
      <ScreenShell title="Blocked">
        <ActivityIndicator color={Brand.red} />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      title="Blocked"
      note={
        rows.length
          ? 'Unblocking lets them appear again, but it does not restore an old match.'
          : 'You haven’t blocked anyone.'
      }
    >
      {rows.map((r) => (
        <ThemedView key={r.blockId} type="backgroundElement" style={styles.row}>
          {r.url ? (
            <Image source={{ uri: r.url }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.noAvatar]} />
          )}
          <ThemedText style={styles.name}>{r.name ?? 'User'}</ThemedText>
          <PrimaryButton
            label="Unblock"
            variant="secondary"
            loading={busy === r.blockId}
            onPress={() => onUnblock(r.blockId)}
            style={styles.btn}
          />
        </ThemedView>
      ))}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Radius.card,
  },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  noAvatar: { backgroundColor: '#26282C' },
  name: { flex: 1, fontSize: 16, fontWeight: '600' },
  btn: { alignSelf: 'auto', paddingHorizontal: Spacing.two },
});
