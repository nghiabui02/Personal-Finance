import { NextResponse } from 'next/server'
import { withAuth, badRequest, notFound, rpcError, deleteOwnedRow, updateOwnedRow, type ServerClient } from '@/lib/server/route'
import { isDebtCategory } from '@/lib/server/system-categories'

async function getRuleCategory(supabase: ServerClient, userId: string, id: string) {
  const { data, error } = await supabase
    .from('recurring_transactions')
    .select('user_category_id')
    .eq('id', id).eq('user_id', userId).maybeSingle()
  if (error) throw new Error(`Could not read recurring category: ${error.message}`)
  return data
}

export const PATCH = withAuth<{ id: string }>(async (request, { supabase, user, params }) => {
  const { id } = params

  const body = await request.json()
  if (Object.hasOwn(body, 'category_id')) return badRequest('categoryContractChanged')

  // Skip mode: advance next_run_date by one occurrence, no transaction created.
  if (body.skip) {
    const { data, error } = await supabase.rpc('skip_recurring_occurrence', { p_id: id })
    if (error) return rpcError(error)
    return data ? NextResponse.json(data) : notFound('recurringTransactionNotFound')
  }

  const { amount, user_category_id, wallet_id, note, frequency, end_date, bank_fee, active } = body

  const needsCurrentRule = user_category_id !== undefined || active === true
  const current = needsCurrentRule ? await getRuleCategory(supabase, user.id, id) : null
  if (needsCurrentRule && !current) return notFound('recurringTransactionNotFound')

  // A rule that already sits in a debt category may still be edited while it
  // stays paused and keeps that category; it cannot start running, or move into
  // one, because the nightly job files its transactions without a debt.
  if (current) {
    const nextCategoryId = user_category_id !== undefined ? (user_category_id || null) : current.user_category_id
    const categoryChanged = nextCategoryId !== current.user_category_id
    if ((categoryChanged || active === true) && await isDebtCategory(supabase, nextCategoryId)) {
      return badRequest('debtCategoryNeedsADebt')
    }
  }

  return updateOwnedRow(supabase, 'recurring_transactions', { id, userId: user.id }, {
    amount: amount ? Number(amount) : undefined,
    user_category_id: user_category_id !== undefined ? (user_category_id || null) : undefined,
    wallet_id: wallet_id !== undefined ? (wallet_id || null) : undefined,
    note: note !== undefined ? (note?.trim() || null) : undefined,
    frequency: frequency || undefined,
    end_date: end_date !== undefined ? (end_date || null) : undefined,
    bank_fee: bank_fee !== undefined ? (Number(bank_fee) > 0 ? Number(bank_fee) : null) : undefined,
    active: active !== undefined ? !!active : undefined,
  })
})

export const DELETE = withAuth<{ id: string }>(async (_request, { supabase, user, params }) => {
  const { id } = params

  return deleteOwnedRow(supabase, 'recurring_transactions', { id, userId: user.id })
})
