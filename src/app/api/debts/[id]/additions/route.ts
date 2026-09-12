import { NextResponse } from 'next/server'
import { withAuth, badRequest, notFound, supabaseError } from '@/lib/server/route'
import { ensureSystemCategory } from '@/lib/server/system-categories'
import { localYMD } from '@/lib/utils/date'

export const POST = withAuth<{ id: string }>(async (request, { supabase, user, params }) => {
  const { id } = params

  const { amount, note, date, wallet_id } = await request.json()
  if (!amount || Number(amount) <= 0) {
    return badRequest('Amount is required.')
  }

  const { data: debt } = await supabase
    .from('debts')
    .select('amount, remaining_amount, type, person_name')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!debt) return notFound('Debt not found.')

  const addAmount = Number(amount)
  const newAmount = Number(debt.amount) + addAmount
  const newRemaining = Number(debt.remaining_amount) + addAmount
  const txDate = date ?? localYMD()

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
    return supabaseError((payErr ?? debtErr)!)
  }

  if (wallet_id) {
    // lend more = expense (money going out), borrow more = income (money coming in)
    const txType = debt.type === 'lend' ? 'expense' : 'income'
    const txNote = note?.trim() || (
      debt.type === 'lend'
        ? `Additional lend to ${debt.person_name}`
        : `Additional borrow from ${debt.person_name}`
    )
    const categoryId = await ensureSystemCategory(supabase, user.id, debt.type === 'lend' ? 'lend_out' : 'borrow_in')

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
      supabase.rpc('adjust_wallet_balance', { p_wallet_id: wallet_id, p_delta: txType === 'income' ? addAmount : -addAmount, p_user_id: user.id }),
    ])
  }

  return NextResponse.json({ amount: newAmount, remaining_amount: newRemaining }, { status: 201 })
})
