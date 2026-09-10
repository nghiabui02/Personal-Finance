import { NextResponse } from 'next/server'
import { withAuth, badRequest, notFound, noContent, supabaseError } from '@/lib/server/route'

export const PATCH = withAuth<{ id: string }>(async (request, { supabase, user, params }) => {
  const { id } = params

  const body = await request.json()
  const { type, amount, category_id, wallet_id, transaction_date, note, bank_fee } = body

  if (!type || !amount || !transaction_date) {
    return badRequest('Type, amount and date are required.')
  }
  if (bank_fee !== undefined && bank_fee !== null && Number(bank_fee) < 0) {
    return badRequest('Bank fee must be positive.')
  }

  // Same convention as POST: incoming `amount` is the base, stored amount is
  // base + fee (the real total that hits the wallet).
  const fee = Number(bank_fee) > 0 ? Number(bank_fee) : null
  const total = Number(amount) + (fee ?? 0)

  // Fetch original to reverse its balance effect
  const { data: original } = await supabase
    .from('transactions')
    .select('type, amount, wallet_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!original) return notFound('Transaction not found.')

  // Reverse old balance effect
  if (original.wallet_id) {
    const oldDelta = original.type === 'income' ? -Number(original.amount) : Number(original.amount)
    const { error: balErr } = await supabase.rpc('adjust_wallet_balance', {
      p_wallet_id: original.wallet_id,
      p_delta: oldDelta,
      p_user_id: user.id,
    })
    if (balErr) return supabaseError(balErr)
  }

  // Update transaction
  const { data, error } = await supabase
    .from('transactions')
    .update({
      type,
      amount: total,
      bank_fee: fee,
      category_id: category_id || null,
      wallet_id: wallet_id || null,
      transaction_date,
      note: note?.trim() || null,
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*, categories(id, name, icon, color), wallets(id, name)')
    .single()

  if (error) return supabaseError(error)

  // Apply new balance effect
  if (wallet_id) {
    const newDelta = type === 'income' ? total : -total
    const { error: balErr } = await supabase.rpc('adjust_wallet_balance', {
      p_wallet_id: wallet_id,
      p_delta: newDelta,
      p_user_id: user.id,
    })
    if (balErr) return supabaseError(balErr)
  }

  return NextResponse.json(data)
})

export const DELETE = withAuth<{ id: string }>(async (_request, { supabase, user, params }) => {
  const { id } = params

  // Fetch transaction to reverse balance and check for linked debt payment
  const { data: tx } = await supabase
    .from('transactions')
    .select('type, amount, wallet_id, debt_payment_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return supabaseError(error)

  // Reverse wallet balance
  if (tx?.wallet_id) {
    const delta = tx.type === 'income' ? -Number(tx.amount) : Number(tx.amount)
    await supabase.rpc('adjust_wallet_balance', {
      p_wallet_id: tx.wallet_id,
      p_delta: delta,
      p_user_id: user.id,
    })
  }

  // Reverse debt if this transaction was created from a debt payment
  if (tx?.debt_payment_id) {
    const { data: payment } = await supabase
      .from('debt_payments')
      .select('debt_id, amount')
      .eq('id', tx.debt_payment_id)
      .single()

    if (payment) {
      const { data: debt } = await supabase
        .from('debts')
        .select('remaining_amount, amount, status')
        .eq('id', payment.debt_id)
        .single()

      if (debt) {
        const restored = Math.min(Number(debt.remaining_amount) + Number(payment.amount), Number(debt.amount))
        await Promise.all([
          supabase.from('debts').update({
            remaining_amount: restored,
            ...(debt.status === 'completed' ? { status: 'active' } : {}),
          }).eq('id', payment.debt_id),
          supabase.from('debt_payments').delete().eq('id', tx.debt_payment_id),
        ])
      }
    }
  }

  return noContent()
})
