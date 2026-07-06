import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withRoute } from '@/lib/server/route'

export const POST = withRoute(async () => {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.json({ success: true })
})
