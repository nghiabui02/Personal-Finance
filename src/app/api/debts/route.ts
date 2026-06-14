import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('debts')
    .select('*, debt_payments(id, amount, note, paid_at)')
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
  const { type, person_name, person_contact, amount, due_date, note } = body

  if (!type || !person_name?.trim() || !amount) {
    return NextResponse.json({ error: 'Type, name and amount are required.' }, { status: 400 })
  }
  if (type !== 'lend' && type !== 'borrow') {
    return NextResponse.json({ error: 'Invalid type.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('debts')
    .insert({
      user_id: user.id,
      type,
      person_name: person_name.trim(),
      person_contact: person_contact?.trim() || null,
      amount: Number(amount),
      remaining_amount: Number(amount),
      due_date: due_date || null,
      note: note?.trim() || null,
      status: 'active',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
