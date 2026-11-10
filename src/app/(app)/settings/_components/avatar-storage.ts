import { createClient } from '@/lib/supabase/client'

const BUCKET = 'Avatar'

/** Deletes every stored picture of this user. One picture is kept per user, so
 *  a new upload replaces the old file even when the extension differs. */
export async function removeStoredAvatars(userId: string): Promise<void> {
  const supabase = createClient()
  const { data: existing } = await supabase.storage.from(BUCKET).list(userId)
  if (existing?.length) {
    await supabase.storage.from(BUCKET).remove(existing.map(file => `${userId}/${file.name}`))
  }
}

/** Replaces the user's stored picture and returns its public address. The
 *  timestamp defeats the browser cache, so the new picture shows at once. */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  await removeStoredAvatars(userId)
  const supabase = createClient()
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${userId}/avatar.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return `${data.publicUrl}?t=${Date.now()}`
}
