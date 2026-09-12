import { NextResponse } from 'next/server'
import { withAuth, badRequest, notFound, supabaseError } from '@/lib/server/route'
import { ensureSystemCategory } from '@/lib/server/system-categories'
import { localYMD } from '@/lib/utils/date'

/**
 * Bring a wallet in line with the real balance read off the bank.
 *
 * The recorded balance is derived from transactions, so fees, interest and
 * forgotten spends make it drift. Rather than overwrite the number — which
 * would leave the history adding up to something else — this files one
 * adjustment transaction for the difference. The drift stays visible and every
 * report keeps balancing.
 */
export const POST = withAuth<{ id: string }>(async (request, { supabase, user, params }) => {
  const { id } = params
  const { actual_balance, note, date } = await request.json()

  const actual = Number(actual_balance)
  if (!Number.isFinite(actual)) return badRequest('Enter the balance shown by your bank.')

  const { data: wallet } = await supabase
    .from('wallets')
    .select('name, type, balance, credit_limit')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!wallet) return notFound('Wallet not found.')

  if (wallet.type === 'credit') {
    const limit = Number(wallet.credit_limit ?? 0)
    // For credit wallets `balance` is available credit, which the database
    // constrains to the card's limit — reject here so the user gets a sentence
    // instead of a constraint violation.
    if (actual < 0 || actual > limit) {
      return badRequest(`Available credit must be between 0 and ${limit}.`)
    }
  } else if (actual < 0) {
    return badRequest('Balance cannot be negative.')
  }

  const delta = actual - Number(wallet.balance)
  if (delta === 0) {
    return NextResponse.json({ ok: true, delta: 0, message: 'Already matches — nothing to adjust.' })
  }

  const categoryId = await ensureSystemCategory(supabase, user.id, delta > 0 ? 'adjust_up' : 'adjust_down')

  const { error: txError } = await supabase.from('transactions').insert({
    user_id: user.id,
    wallet_id: id,
    category_id: categoryId,
    type: delta > 0 ? 'income' : 'expense',
    amount: Math.abs(delta),
    note: note?.trim() || `Reconciled ${wallet.name}`,
    transaction_date: date ?? localYMD(),
  })
  if (txError) return supabaseError(txError)

  const { error: balanceError } = await supabase.rpc('adjust_wallet_balance', {
    p_wallet_id: id,
    p_delta: delta,
    p_user_id: user.id,
  })
  if (balanceError) return supabaseError(balanceError)

  return NextResponse.json({ ok: true, delta, new_balance: actual })
})
