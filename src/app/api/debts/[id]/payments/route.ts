import { NextResponse } from 'next/server'
import { withAuth, badRequest, notFound, supabaseError } from '@/lib/server/route'
import { ensureDebtCategory } from '@/lib/server/debt-categories'
import { localYMD } from '@/lib/utils/date'

export const POST = withAuth<{ id: string }>(async (request, { supabase, user, params }) => {
  const { id } = params

  const { amount, note, wallet_id, date } = await request.json()
  if (!amount || Number(amount) <= 0) {
    return badRequest('Amount is required.')
  }

  const { data: debt } = await supabase
    .from('debts')
    .select('remaining_amount, type, person_name, wallet_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!debt) return notFound('Debt not found.')

  if (Number(debt.remaining_amount) <= 0) {
    return badRequest('This debt is already fully paid.')
  }

  if (Number(amount) > Number(debt.remaining_amount)) {
    return badRequest('Payment exceeds remaining balance.')
  }

  const newRemaining = Math.max(0, Number(debt.remaining_amount) - Number(amount))
  const isSettled = newRemaining === 0

  const { data: payment, error: payErr } = await supabase
    .from('debt_payments')
    .insert({ debt_id: id, amount: Number(amount), note: note?.trim() || null })
    .select('id')
    .single()

  if (payErr) return supabaseError(payErr)

  const { error: debtErr } = await supabase
    .from('debts')
    .update({ remaining_amount: newRemaining, ...(isSettled ? { status: 'completed' } : {}) })
    .eq('id', id)
    .eq('user_id', user.id)

  if (debtErr) return supabaseError(debtErr)

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
      return badRequest('Insufficient balance in wallet.')
    }

    const txNote = note?.trim() || (debt.type === 'lend'
      ? `Repayment from ${debt.person_name}`
      : `Repayment to ${debt.person_name}`)
    const txDate = date ?? localYMD()
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
})
