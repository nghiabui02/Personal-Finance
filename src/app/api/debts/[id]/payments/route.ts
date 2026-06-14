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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { amount, note, wallet_id } = await request.json()
  if (!amount || Number(amount) <= 0) {
    return NextResponse.json({ error: 'Amount is required.' }, { status: 400 })
  }

  const { data: debt } = await supabase
    .from('debts')
    .select('remaining_amount, type, person_name, wallet_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!debt) return NextResponse.json({ error: 'Debt not found.' }, { status: 404 })

  const newRemaining = Math.max(0, Number(debt.remaining_amount) - Number(amount))
  const isSettled = newRemaining === 0

  const [{ error: payErr }, { error: debtErr }] = await Promise.all([
    supabase.from('debt_payments').insert({
      debt_id: id,
      amount: Number(amount),
      note: note?.trim() || null,
    }),
    supabase.from('debts').update({
      remaining_amount: newRemaining,
      ...(isSettled ? { status: 'completed' } : {}),
    }).eq('id', id).eq('user_id', user.id),
  ])

  if (payErr || debtErr) {
    return NextResponse.json({ error: payErr?.message ?? debtErr?.message }, { status: 500 })
  }

  // lend payment received = income (money comes back), borrow payment made = expense
  const effectiveWalletId = wallet_id || debt.wallet_id
  if (effectiveWalletId) {
    const txType = debt.type === 'lend' ? 'income' : 'expense'
    const txNote = note?.trim() || (debt.type === 'lend'
      ? `Repayment from ${debt.person_name}`
      : `Repayment to ${debt.person_name}`)
    const today = new Date().toISOString().slice(0, 10)

    await Promise.all([
      supabase.from('transactions').insert({
        user_id: user.id,
        type: txType,
        amount: Number(amount),
        wallet_id: effectiveWalletId,
        transaction_date: today,
        note: txNote,
      }),
      adjustBalance(supabase, effectiveWalletId, txType === 'income' ? Number(amount) : -Number(amount), user.id),
    ])
  }

  return NextResponse.json({ remaining_amount: newRemaining, settled: isSettled }, { status: 201 })
}
