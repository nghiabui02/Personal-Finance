import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const type = request.nextUrl.searchParams.get('type')

  let query = supabase
    .from('categories')
    .select('*')
    .order('is_default', { ascending: false })
    .order('name')

  if (type === 'income' || type === 'expense') {
    query = query.eq('type', type)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, icon, color, type } = body

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
  if (type !== 'income' && type !== 'expense') return NextResponse.json({ error: 'Invalid type.' }, { status: 400 })

  const { data, error } = await supabase
    .from('categories')
    .insert({ user_id: user.id, name: name.trim(), icon: icon?.trim() || null, color: color || null, type })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
