import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Auth preamble every server page needs: a Supabase client plus the signed-in
 * user, guaranteed non-null. Mirrors `withAuth` on the API side.
 *
 * `(app)/layout.tsx` and the proxy already redirect anonymous visitors, so this
 * is the third line of defence — it redirects rather than rendering a blank
 * page, which is what returning null used to do.
 */
export async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return { supabase, user }
}
