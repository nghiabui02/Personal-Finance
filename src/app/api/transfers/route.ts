import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { from_wallet_id, to_wallet_id, amount, note, transfer_date } = await request.json()

  if (!from_wallet_id || !to_wallet_id) {
    return NextResponse.json({ error: 'Both wallets are required.' }, { status: 400 })
  }
  if (from_wallet_id === to_wallet_id) {
    return NextResponse.json({ error: 'Source and destination wallets must be different.' }, { status: 400 })
  }
  if (!amount || Number(amount) <= 0) {
    return NextResponse.json({ error: 'Amount must be greater than 0.' }, { status: 400 })
  }

  // Fetch both wallet names for the notes
  const { data: wallets } = await supabase
    .from('wallets')
    .select('id, name, balance')
    .in('id', [from_wallet_id, to_wallet_id])
    .eq('user_id', user.id)

  if (!wallets || wallets.length < 2) {
    return NextResponse.json({ error: 'One or both wallets not found.' }, { status: 404 })
  }

  const fromWallet = wallets.find(w => w.id === from_wallet_id)
  if (fromWallet && Number(fromWallet.balance) < Number(amount)) {
    return NextResponse.json({ error: 'Insufficient balance in source wallet.' }, { status: 400 })
  }
  const toWallet = wallets.find(w => w.id === to_wallet_id)
  const pairId = crypto.randomUUID()
  const date = transfer_date ?? new Date().toISOString().slice(0, 10)
  const baseNote = note?.trim() || null

  const [{ error: err1 }, { error: err2 }] = await Promise.all([
    supabase.from('transactions').insert({
      user_id: user.id,
      wallet_id: from_wallet_id,
      type: 'expense',
      amount: Number(amount),
      note: baseNote ?? `Transfer to ${toWallet?.name}`,
      transaction_date: date,
      transfer_pair_id: pairId,
    }),
    supabase.from('transactions').insert({
      user_id: user.id,
      wallet_id: to_wallet_id,
      type: 'income',
      amount: Number(amount),
      note: baseNote ?? `Transfer from ${fromWallet?.name}`,
      transaction_date: date,
      transfer_pair_id: pairId,
    }),
  ])

  if (err1 || err2) {
    return NextResponse.json({ error: err1?.message ?? err2?.message }, { status: 500 })
  }

  await Promise.all([
    supabase.rpc('adjust_wallet_balance', { p_wallet_id: from_wallet_id, p_delta: -Number(amount), p_user_id: user.id }),
    supabase.rpc('adjust_wallet_balance', { p_wallet_id: to_wallet_id, p_delta: Number(amount), p_user_id: user.id }),
  ])

  return NextResponse.json({ success: true, transfer_pair_id: pairId }, { status: 201 })
}
