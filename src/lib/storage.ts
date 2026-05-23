import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/lib/supabase';

export const PHOTOS_BUCKET = 'photos';
export const KIT_BUCKET = 'kit-photos';

function randomId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Open the library, return the chosen local URI (or null if cancelled/denied). */
export async function pickImage(aspect: [number, number] = [4, 5]): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect,
    quality: 1,
  });
  if (result.canceled || !result.assets?.length) return null;
  return result.assets[0].uri;
}

/** Resize (max 1080 wide) + JPEG compress before upload — saves storage + bandwidth. */
async function compress(uri: string): Promise<{ uri: string; contentType: string }> {
  const out = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1080 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
  );
  return { uri: out.uri, contentType: 'image/jpeg' };
}

async function toArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const res = await fetch(uri);
  return res.arrayBuffer();
}

/** Upload a profile photo to the private `photos` bucket; returns the storage path. */
export async function uploadProfilePhoto(authUserId: string, localUri: string): Promise<string> {
  const { uri, contentType } = await compress(localUri);
  const path = `${authUserId}/${randomId()}.jpg`;
  const body = await toArrayBuffer(uri);
  const { error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .upload(path, body, { contentType, upsert: false });
  if (error) throw error;
  return path;
}

/** Upload (replace) the single kit photo to the private `kit-photos` bucket. */
export async function uploadKitPhoto(authUserId: string, localUri: string): Promise<string> {
  const { uri, contentType } = await compress(localUri);
  const path = `${authUserId}/kit.jpg`;
  const body = await toArrayBuffer(uri);
  const { error } = await supabase.storage
    .from(KIT_BUCKET)
    .upload(path, body, { contentType, upsert: true });
  if (error) throw error;
  return path;
}

/** Short-lived signed URL for one private object. */
export async function signedUrl(
  bucket: string,
  path: string,
  expiresIn = 3600,
): Promise<string | null> {
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  return data?.signedUrl ?? null;
}

/** Signed URLs for many objects, keyed by their storage path. */
export async function signedUrls(
  bucket: string,
  paths: string[],
  expiresIn = 3600,
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data } = await supabase.storage.from(bucket).createSignedUrls(paths, expiresIn);
  const map: Record<string, string> = {};
  (data ?? []).forEach((d) => {
    if (d.path && d.signedUrl) map[d.path] = d.signedUrl;
  });
  return map;
}

/** Remove a profile photo object from storage. */
export async function deletePhotoObject(path: string): Promise<void> {
  await supabase.storage.from(PHOTOS_BUCKET).remove([path]);
}

/**
 * Signed URLs for OTHER users' photos, via the sign-photos Edge Function (which
 * applies the visibility check). The photos bucket is owner-only, so this is the
 * only way to view others' photos. Returns profileId -> [signed URLs].
 */
export async function signProfilePhotos(
  profileIds: string[],
): Promise<Record<string, string[]>> {
  const ids = Array.from(new Set(profileIds)).filter(Boolean);
  if (ids.length === 0) return {};
  const { data, error } = await supabase.functions.invoke('sign-photos', {
    body: { profileIds: ids },
  });
  if (error) return {};
  return (data?.photos ?? {}) as Record<string, string[]>;
}
