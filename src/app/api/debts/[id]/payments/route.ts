import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ensureDebtCategory } from '@/lib/server/debt-categories'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { amount, note, wallet_id, date } = await request.json()
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

  if (Number(debt.remaining_amount) <= 0) {
    return NextResponse.json({ error: 'This debt is already fully paid.' }, { status: 400 })
  }

  if (Number(amount) > Number(debt.remaining_amount)) {
    return NextResponse.json({ error: 'Payment exceeds remaining balance.' }, { status: 400 })
  }

  const newRemaining = Math.max(0, Number(debt.remaining_amount) - Number(amount))
  const isSettled = newRemaining === 0

  const { data: payment, error: payErr } = await supabase
    .from('debt_payments')
    .insert({ debt_id: id, amount: Number(amount), note: note?.trim() || null })
    .select('id')
    .single()

  if (payErr) return NextResponse.json({ error: payErr.message }, { status: 500 })

  const { error: debtErr } = await supabase
    .from('debts')
    .update({ remaining_amount: newRemaining, ...(isSettled ? { status: 'completed' } : {}) })
    .eq('id', id)
    .eq('user_id', user.id)

  if (debtErr) return NextResponse.json({ error: debtErr.message }, { status: 500 })

  const effectiveWalletId = wallet_id || debt.wallet_id
  if (effectiveWalletId) {
    // Fetch type + balance of the actual wallet being used (not debt's default wallet)
    const { data: walletData } = await supabase
      .from('wallets')
      .select('type, balance')
      .eq('id', effectiveWalletId)
      .eq('user_id', user.id)
      .single()

    const isCreditWallet = walletData?.type === 'credit'

    // lend=income (collecting), borrow=expense (paying out); credit wallet always restores (income)
    const txType = isCreditWallet ? 'income' : (debt.type === 'lend' ? 'income' : 'expense')

    if (txType === 'expense' && walletData && Number(walletData.balance) < Number(amount)) {
      return NextResponse.json({ error: 'Insufficient balance in wallet.' }, { status: 400 })
    }

    const txNote = note?.trim() || (debt.type === 'lend'
      ? `Repayment from ${debt.person_name}`
      : `Repayment to ${debt.person_name}`)
    const txDate = date ?? new Date().toISOString().slice(0, 10)
    const categoryId = await ensureDebtCategory(supabase, user.id, debt.type === 'lend' ? 'collect_debt' : 'repay_debt')

    const delta = txType === 'income' ? Number(amount) : -Number(amount)
    await Promise.all([
      supabase.from('transactions').insert({
        user_id: user.id,
        type: txType,
        amount: Number(amount),
        wallet_id: effectiveWalletId,
        transaction_date: txDate,
        note: txNote,
        debt_payment_id: payment.id,
        category_id: categoryId,
      }),
      supabase.rpc('adjust_wallet_balance', { p_wallet_id: effectiveWalletId, p_delta: delta, p_user_id: user.id }),
    ])
  }

  return NextResponse.json({ remaining_amount: newRemaining, settled: isSettled }, { status: 201 })
}
