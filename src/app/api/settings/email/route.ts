import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email } = await request.json()
  if (!email?.trim()) return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
  if (email.trim() === user.email) return NextResponse.json({ error: 'This is already your current email.' }, { status: 400 })

  const { error } = await supabase.auth.updateUser({ email: email.trim() })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ message: 'Confirmation email sent. Check your inbox.' })
}
