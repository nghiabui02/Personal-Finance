import { NextResponse } from 'next/server'
import { withAuth, badRequest, notFound, supabaseError } from '@/lib/server/route'
import { localYMD } from '@/lib/utils/date'

export const POST = withAuth(async (request, { supabase, user }) => {
  const { from_wallet_id, to_wallet_id, amount, note, transfer_date } = await request.json()

  if (!from_wallet_id || !to_wallet_id) {
    return badRequest('Both wallets are required.')
  }
  if (from_wallet_id === to_wallet_id) {
    return badRequest('Source and destination wallets must be different.')
  }
  if (!amount || Number(amount) <= 0) {
    return badRequest('Amount must be greater than 0.')
  }

  // Fetch both wallet names for the notes
  const { data: wallets } = await supabase
    .from('wallets')
    .select('id, name, balance')
    .in('id', [from_wallet_id, to_wallet_id])
    .eq('user_id', user.id)

  if (!wallets || wallets.length < 2) {
    return notFound('One or both wallets not found.')
  }

  const fromWallet = wallets.find(w => w.id === from_wallet_id)
  if (fromWallet && Number(fromWallet.balance) < Number(amount)) {
    return badRequest('Insufficient balance in source wallet.')
  }
  const toWallet = wallets.find(w => w.id === to_wallet_id)
  const pairId = crypto.randomUUID()
  const date = transfer_date ?? localYMD()
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
    return supabaseError((err1 ?? err2)!)
  }

  await Promise.all([
    supabase.rpc('adjust_wallet_balance', { p_wallet_id: from_wallet_id, p_delta: -Number(amount), p_user_id: user.id }),
    supabase.rpc('adjust_wallet_balance', { p_wallet_id: to_wallet_id, p_delta: Number(amount), p_user_id: user.id }),
  ])

  return NextResponse.json({ success: true, transfer_pair_id: pairId }, { status: 201 })
})
