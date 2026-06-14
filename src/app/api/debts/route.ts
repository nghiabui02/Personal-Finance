import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { SupabaseClient } from '@supabase/supabase-js'

async function adjustBalance(
  supabase: SupabaseClient,
  walletId: string,
  delta: number,
  userId: string,
) {
  const { data: wallet } = await supabase
    .from('wallets')
    .select('balance')
    .eq('id', walletId)
    .eq('user_id', userId)
    .single()

  if (!wallet) return

  await supabase
    .from('wallets')
    .update({ balance: Number(wallet.balance) + delta })
    .eq('id', walletId)
    .eq('user_id', userId)
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('debts')
    .select('*, debt_payments(id, amount, note, paid_at), wallets(id, name)')
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
  const { type, person_name, person_contact, amount, due_date, note, wallet_id } = body

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
      wallet_id: wallet_id || null,
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

  if (wallet_id) {
    const txType = type === 'lend' ? 'expense' : 'income'
    const txNote = type === 'lend' ? `Lent to ${person_name.trim()}` : `Borrowed from ${person_name.trim()}`
    const today = new Date().toISOString().slice(0, 10)

    await Promise.all([
      supabase.from('transactions').insert({
        user_id: user.id,
        type: txType,
        amount: Number(amount),
        wallet_id,
        transaction_date: today,
        note: txNote,
      }),
      adjustBalance(supabase, wallet_id, txType === 'income' ? Number(amount) : -Number(amount), user.id),
    ])
  }

  return NextResponse.json(data, { status: 201 })
}
