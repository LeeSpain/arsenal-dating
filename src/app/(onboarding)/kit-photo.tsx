import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { Brand, Functional, Radius } from '@/constants/theme';
import { useSession } from '@/lib/session';
import { KIT_BUCKET, pickImage, signedUrl, uploadKitPhoto } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

// Kit photo is stored + flagged for MANUAL review (Q4). Onboarding NEVER blocks
// on it — both "Continue" and "Skip" move on; the verified badge is applied
// later when the founder approves.
export default function KitPhoto() {
  const router = useRouter();
  const { session } = useSession();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('none');
  const [kitUrl, setKitUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, kit_photo_url, kit_review_status')
        .maybeSingle();
      if (prof) {
        setProfileId(prof.id);
        setStatus(prof.kit_review_status ?? 'none');
        if (prof.kit_photo_url) setKitUrl(await signedUrl(KIT_BUCKET, prof.kit_photo_url));
      }
      setLoading(false);
    })();
  }, []);

  async function onUpload() {
    if (!session || !profileId) return;
    setError(null);
    const uri = await pickImage([1, 1]);
    if (!uri) return;
    setUploading(true);
    try {
      const path = await uploadKitPhoto(session.user.id, uri);
      await supabase
        .from('profiles')
        .update({ kit_photo_url: path, kit_review_status: 'pending' })
        .eq('id', profileId);
      setStatus('pending');
      setKitUrl(await signedUrl(KIT_BUCKET, path));
    } catch {
      setError('Could not upload that photo. Please try again.');
    }
    setUploading(false);
  }

  async function advance() {
    setBusy(true);
    await supabase.from('profiles').update({ onboarding_step: 'questionnaire' }).eq('id', profileId!);
    setBusy(false);
    router.replace('/questionnaire');
  }

  if (loading) {
    return (
      <ScreenShell title="Show us your Arsenal kit">
        <ActivityIndicator color={Brand.red} />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      title="Show us your Arsenal kit"
      subtitle="A photo of you in an Arsenal top."
      note="We review kit photos by hand and add your verified badge later — it never holds up your sign-up, so feel free to keep going."
    >
      {kitUrl ? (
        <View style={styles.previewWrap}>
          <Image source={{ uri: kitUrl }} style={styles.preview} contentFit="cover" />
          {status === 'pending' ? (
            <ThemedText type="small" themeColor="textSecondary">
              Submitted — we’ll review it and add your verified badge later.
            </ThemedText>
          ) : null}
        </View>
      ) : null}

      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}

      {kitUrl ? (
        <>
          <PrimaryButton
            label={uploading ? 'Uploading…' : 'Replace photo'}
            variant="secondary"
            loading={uploading}
            onPress={onUpload}
          />
          <PrimaryButton label="Continue" loading={busy} onPress={advance} />
        </>
      ) : (
        <>
          <PrimaryButton
            label="Upload kit photo"
            loading={uploading}
            onPress={onUpload}
          />
          <PrimaryButton label="Skip for now" variant="secondary" onPress={advance} />
        </>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  previewWrap: { gap: 8 },
  preview: { width: 160, height: 160, borderRadius: Radius.card },
  error: { color: Functional.error },
});
