import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Share, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { Functional, Spacing } from '@/constants/theme';
import { eraseAccount } from '@/lib/account';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

// Profile / settings hub. Profile editing + report/block are shells (step 3+).
// The auth actions here — sign out and GDPR account deletion — are live.
export default function You() {
  const router = useRouter();
  const { signOut, profileStatus } = useSession();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purging, setPurging] = useState(false);
  const [purgeNotice, setPurgeNotice] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [dataNotice, setDataNotice] = useState<string | null>(null);

  async function onSignOut() {
    await signOut();
    router.replace('/welcome');
  }

  async function onExport() {
    setError(null);
    setExporting(true);
    const { data, error: exportErr } = await supabase.rpc('export_my_data');
    setExporting(false);
    if (exportErr) {
      setError('Could not export your data. Please try again.');
      return;
    }
    const json = JSON.stringify(data, null, 2);
    try {
      if (Platform.OS === 'web') {
        const w = globalThis as any;
        const blob = new w.Blob([json], { type: 'application/json' });
        const objectUrl = w.URL.createObjectURL(blob);
        const a = w.document.createElement('a');
        a.href = objectUrl;
        a.download = 'arsenal-dating-data.json';
        a.click();
        w.URL.revokeObjectURL(objectUrl);
      } else {
        await Share.share({ message: json });
      }
      setDataNotice('Your data export is ready.');
    } catch {
      setDataNotice('Export ready (could not auto-deliver).');
    }
  }

  async function onPurge() {
    setPurging(true);
    setError(null);
    const { data, error: purgeErr } = await supabase.functions.invoke('purge-orphans', {
      method: 'POST',
    });
    setPurging(false);
    if (purgeErr) {
      setError('Purge failed.');
      return;
    }
    setPurgeNotice(`Purged ${data?.purged ?? 0} orphaned image(s).`);
  }

  async function onDelete() {
    setError(null);
    setBusy(true);
    try {
      await eraseAccount(); // full erasure: storage + cascade DB + auth user
      router.replace('/welcome');
      supabase.auth.signOut();
    } catch {
      setBusy(false);
      setError('Could not delete your account. Please try again.');
    }
  }

  return (
    <ScreenShell
      title="You"
      subtitle="Your profile, settings, and safety tools."
      note="Profile editing and report/block are shells (step 3+). Sign out and account deletion below are live."
    >
      {profileStatus?.isAdmin ? (
        <>
          <PrimaryButton label="Kit review queue" onPress={() => router.push('/admin/kit-review')} />
          <PrimaryButton label="Reports queue" onPress={() => router.push('/admin/reports')} />
          <PrimaryButton
            label="Purge orphaned images"
            variant="secondary"
            loading={purging}
            onPress={onPurge}
          />
          {purgeNotice ? (
            <ThemedText type="small" themeColor="textSecondary">
              {purgeNotice}
            </ThemedText>
          ) : null}
        </>
      ) : null}
      <PrimaryButton
        label="Blocked users"
        variant="secondary"
        onPress={() => router.push('/blocked')}
      />
      <PrimaryButton
        label="Request my data (GDPR)"
        variant="secondary"
        loading={exporting}
        onPress={onExport}
      />
      {dataNotice ? (
        <ThemedText type="small" themeColor="textSecondary">
          {dataNotice}
        </ThemedText>
      ) : null}
      <PrimaryButton
        label="About this project"
        variant="secondary"
        onPress={() => router.push('/about')}
      />
      <PrimaryButton label="Sign out" variant="secondary" onPress={onSignOut} />

      {!confirming ? (
        <PrimaryButton
          label="Delete my account"
          variant="secondary"
          onPress={() => setConfirming(true)}
        />
      ) : (
        <View style={styles.confirm}>
          <ThemedText type="small" themeColor="textSecondary">
            This permanently deletes your account, photos, and all your data. This
            cannot be undone.
          </ThemedText>
          <PrimaryButton label="Delete forever" loading={busy} onPress={onDelete} />
          <PrimaryButton
            label="Cancel"
            variant="secondary"
            onPress={() => setConfirming(false)}
          />
        </View>
      )}

      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  confirm: { gap: Spacing.one, marginTop: Spacing.one },
  error: { color: Functional.error },
});
