import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('saving_goals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, icon, target_amount, deadline, note } = body

  if (!name?.trim() || !target_amount) {
    return NextResponse.json({ error: 'Name and target amount are required.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('saving_goals')
    .insert({
      user_id: user.id,
      name: name.trim(),
      icon: icon?.trim() || null,
      target_amount: Number(target_amount),
      current_amount: 0,
      deadline: deadline || null,
      status: 'active',
      note: note?.trim() || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
