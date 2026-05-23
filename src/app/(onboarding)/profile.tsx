import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { OptionGroup } from '@/components/option-group';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenShell } from '@/components/screen-shell';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Brand, Functional, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/lib/session';
import {
  PHOTOS_BUCKET,
  deletePhotoObject,
  pickImage,
  signedUrls,
  uploadProfilePhoto,
} from '@/lib/storage';
import { supabase } from '@/lib/supabase';

const GENDERS = [
  { label: 'Woman', value: 'woman' },
  { label: 'Man', value: 'man' },
  { label: 'Non-binary', value: 'non_binary' },
  { label: 'Other', value: 'other' },
  { label: 'Prefer not to say', value: 'prefer_not_to_say' },
];

const LOOKING_FOR = [
  { label: 'A relationship', value: 'relationship' },
  { label: 'Something casual', value: 'casual' },
  { label: 'Matchday mates', value: 'friends' },
  { label: 'Not sure yet', value: 'unsure' },
];

const MAX_PHOTOS = 6;

type Photo = { id: string; path: string; url?: string; isPrimary: boolean };

export default function ProfileCreation() {
  const router = useRouter();
  const theme = useTheme();
  const { session, refreshProfileStatus } = useSession();

  const [profileId, setProfileId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [gender, setGender] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, display_name, gender, looking_for, bio')
        .maybeSingle();
      if (prof) {
        setProfileId(prof.id);
        setDisplayName(prof.display_name ?? '');
        setGender(prof.gender ? [prof.gender] : []);
        setLookingFor(prof.looking_for ? [prof.looking_for] : []);
        setBio(prof.bio ?? '');
        await loadPhotos(prof.id);
      }
      setLoading(false);
    })();
  }, []);

  async function loadPhotos(pid: string) {
    const { data } = await supabase
      .from('photos')
      .select('id, url, is_primary, sort_order')
      .eq('profile_id', pid)
      .order('is_primary', { ascending: false })
      .order('sort_order');
    const rows = data ?? [];
    const urls = await signedUrls(PHOTOS_BUCKET, rows.map((r) => r.url as string));
    setPhotos(
      rows.map((r) => ({
        id: r.id as string,
        path: r.url as string,
        url: urls[r.url as string],
        isPrimary: !!r.is_primary,
      })),
    );
  }

  async function onAddPhoto() {
    if (!session || !profileId || photos.length >= MAX_PHOTOS) return;
    setError(null);
    const uri = await pickImage();
    if (!uri) return;
    setUploading(true);
    try {
      const path = await uploadProfilePhoto(session.user.id, uri);
      await supabase.from('photos').insert({
        profile_id: profileId,
        url: path,
        is_primary: photos.length === 0,
        sort_order: photos.length,
      });
      await loadPhotos(profileId);
    } catch {
      setError('Could not upload that photo. Please try again.');
    }
    setUploading(false);
  }

  async function onRemovePhoto(p: Photo) {
    if (!profileId) return;
    await deletePhotoObject(p.path);
    await supabase.from('photos').delete().eq('id', p.id);
    // If we removed the primary, promote the first remaining one.
    const remaining = photos.filter((x) => x.id !== p.id);
    if (p.isPrimary && remaining[0]) {
      await supabase.from('photos').update({ is_primary: true }).eq('id', remaining[0].id);
    }
    await loadPhotos(profileId);
  }

  async function onSetPrimary(p: Photo) {
    if (!profileId || p.isPrimary) return;
    await supabase.from('photos').update({ is_primary: false }).eq('profile_id', profileId);
    await supabase.from('photos').update({ is_primary: true }).eq('id', p.id);
    await loadPhotos(profileId);
  }

  async function onContinue() {
    setError(null);
    if (!displayName.trim()) return setError('Add a display name.');
    if (gender.length === 0) return setError('Select your gender.');
    if (photos.length === 0) return setError('Add at least one photo.');

    setBusy(true);
    const { error: upErr } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim(),
        gender: gender[0],
        looking_for: lookingFor[0] ?? null,
        bio: bio.trim() || null,
        onboarding_step: 'kit_photo',
      })
      .eq('id', profileId!);
    setBusy(false);
    if (upErr) return setError('Could not save. Please try again.');
    await refreshProfileStatus();
    router.replace('/kit-photo');
  }

  if (loading) {
    return (
      <ScreenShell title="Create your profile">
        <ActivityIndicator color={Brand.red} />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title="Create your profile" subtitle="Photos, a few details, and what you're after.">
      <ThemedText type="small" themeColor="textSecondary">
        Photos ({photos.length}/{MAX_PHOTOS}) — tap one to make it your main photo.
      </ThemedText>
      <View style={styles.grid}>
        {photos.map((p) => (
          <Pressable key={p.id} onPress={() => onSetPrimary(p)} style={styles.tile}>
            <Image source={{ uri: p.url }} style={styles.thumb} contentFit="cover" />
            {p.isPrimary ? (
              <View style={styles.primaryTag}>
                <ThemedText style={styles.primaryText}>Main</ThemedText>
              </View>
            ) : null}
            <Pressable onPress={() => onRemovePhoto(p)} style={styles.removeBtn} hitSlop={8}>
              <ThemedText style={styles.removeText}>✕</ThemedText>
            </Pressable>
          </Pressable>
        ))}
        {photos.length < MAX_PHOTOS ? (
          <Pressable
            onPress={onAddPhoto}
            style={[styles.tile, styles.addTile, { borderColor: theme.border }]}
          >
            {uploading ? (
              <ActivityIndicator color={Brand.red} />
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                + Add
              </ThemedText>
            )}
          </Pressable>
        ) : null}
      </View>

      <TextField
        label="Display name"
        value={displayName}
        onChangeText={setDisplayName}
        maxLength={30}
        placeholder="What should people call you?"
      />

      <ThemedText type="small" style={styles.label}>
        Gender
      </ThemedText>
      <OptionGroup options={GENDERS} selected={gender} onChange={setGender} />

      <ThemedText type="small" style={styles.label}>
        Looking for
      </ThemedText>
      <OptionGroup options={LOOKING_FOR} selected={lookingFor} onChange={setLookingFor} />

      <TextField
        label="Bio"
        value={bio}
        onChangeText={setBio}
        maxLength={300}
        multiline
        placeholder="A line or two about you (optional)"
        style={styles.bio}
      />

      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
      <PrimaryButton label="Continue" loading={busy} onPress={onContinue} />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  tile: { width: 96, height: 120, borderRadius: Radius.card, overflow: 'hidden' },
  thumb: { width: '100%', height: '100%' },
  addTile: { borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  primaryTag: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    backgroundColor: Brand.red,
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  primaryText: { color: Brand.white, fontSize: 11, fontWeight: '700' },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  label: { marginLeft: Spacing.half, marginTop: Spacing.one },
  bio: { minHeight: 88, paddingTop: Spacing.one, textAlignVertical: 'top' },
  error: { color: Functional.error },
});
