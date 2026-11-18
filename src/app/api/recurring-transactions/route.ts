import { NextResponse } from 'next/server'
import { withAuth, badRequest, supabaseError } from '@/lib/server/route'
import { isDebtCategory } from '@/lib/server/system-categories'

export const POST = withAuth(async (request, { supabase, user }) => {
  const body = await request.json()
  const { type, amount, category_id, wallet_id, note, frequency, start_date, end_date, bank_fee } = body

  if (!type || !amount || !frequency || !start_date) {
    return badRequest('typeAmountFrequencyAndStartDateAreRequired')
  }
  if (!['income', 'expense'].includes(type)) return badRequest('invalidType')
  if (!['daily', 'weekly', 'monthly', 'yearly'].includes(frequency)) {
    return badRequest('invalidFrequency')
  }
  if (bank_fee !== undefined && bank_fee !== null && Number(bank_fee) < 0) {
    return badRequest('bankFeeMustBePositive')
  }
  // The nightly job files transactions without a debt, which a debt category forbids.
  if (await isDebtCategory(supabase, category_id || null)) return badRequest('debtCategoryNeedsADebt')

  const { data, error } = await supabase
    .from('recurring_transactions')
    .insert({
      user_id: user.id,
      type,
      amount: Number(amount),
      category_id: category_id || null,
      wallet_id: wallet_id || null,
      note: note?.trim() || null,
      frequency,
      start_date,
      end_date: end_date || null,
      next_run_date: start_date,
      bank_fee: Number(bank_fee) > 0 ? Number(bank_fee) : null,
    })
    .select()
    .single()

  if (error) return supabaseError(error)
  return NextResponse.json(data, { status: 201 })
})
