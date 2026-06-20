import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { ensureDebtCategory } from '@/lib/server/debt-categories'

async function adjustBalance(supabase: SupabaseClient, walletId: string, delta: number, userId: string) {
  const { data: wallet } = await supabase
    .from('wallets').select('balance').eq('id', walletId).eq('user_id', userId).single()
  if (!wallet) return
  await supabase.from('wallets')
    .update({ balance: Number(wallet.balance) + delta })
    .eq('id', walletId).eq('user_id', userId)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { amount, note, date, wallet_id } = await request.json()
  if (!amount || Number(amount) <= 0) {
    return NextResponse.json({ error: 'Amount is required.' }, { status: 400 })
  }

  const { data: debt } = await supabase
    .from('debts')
    .select('amount, remaining_amount, type, person_name')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!debt) return NextResponse.json({ error: 'Debt not found.' }, { status: 404 })

  const addAmount = Number(amount)
  const newAmount = Number(debt.amount) + addAmount
  const newRemaining = Number(debt.remaining_amount) + addAmount
  const txDate = date ?? new Date().toISOString().slice(0, 10)

  const [{ error: payErr }, { error: debtErr }] = await Promise.all([
    supabase.from('debt_payments').insert({
      debt_id: id,
      amount: addAmount,
      note: note?.trim() || null,
      paid_at: txDate,
      type: 'addition',
    }),
    supabase.from('debts')
      .update({ amount: newAmount, remaining_amount: newRemaining, status: 'active' })
      .eq('id', id)
      .eq('user_id', user.id),
  ])

  if (payErr || debtErr) {
    return NextResponse.json({ error: payErr?.message ?? debtErr?.message }, { status: 500 })
  }

  if (wallet_id) {
    // lend more = expense (money going out), borrow more = income (money coming in)
    const txType = debt.type === 'lend' ? 'expense' : 'income'
    const txNote = note?.trim() || (
      debt.type === 'lend'
        ? `Additional lend to ${debt.person_name}`
        : `Additional borrow from ${debt.person_name}`
    )
    const categoryId = await ensureDebtCategory(supabase, user.id, debt.type === 'lend' ? 'lend_out' : 'borrow_in')

    await Promise.all([
      supabase.from('transactions').insert({
        user_id: user.id,
        type: txType,
        amount: addAmount,
        wallet_id,
        transaction_date: txDate,
        note: txNote,
        category_id: categoryId,
      }),
      adjustBalance(supabase, wallet_id, txType === 'income' ? addAmount : -addAmount, user.id),
    ])
  }

  return NextResponse.json({ amount: newAmount, remaining_amount: newRemaining }, { status: 201 })
}
