import { NextResponse } from 'next/server'
import { withAuth, notFound, noContent, supabaseError } from '@/lib/server/route'
import { localYMD, toYMD } from '@/lib/utils/date'

// Advances a YYYY-MM-DD by one occurrence of the given frequency — mirrors
// the SQL function process_recurring_all_users() so "skip" and the nightly
// cron always land on the same next date.
function nextOccurrence(current: string, frequency: string): string {
  const [y, m, d] = current.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  switch (frequency) {
    case 'daily':   date.setDate(date.getDate() + 1); break
    case 'weekly':  date.setDate(date.getDate() + 7); break
    case 'monthly': date.setMonth(date.getMonth() + 1); break
    case 'yearly':  date.setFullYear(date.getFullYear() + 1); break
  }
  return toYMD(date)
}

export const PATCH = withAuth<{ id: string }>(async (request, { supabase, user, params }) => {
  const { id } = params

  const body = await request.json()

  // Skip mode: advance next_run_date by one occurrence, no transaction created.
  if (body.skip) {
    const { data: current } = await supabase
      .from('recurring_transactions')
      .select('next_run_date, frequency')
      .eq('id', id).eq('user_id', user.id).single()

    if (!current) return notFound('Recurring transaction not found.')
    if (!current.next_run_date) return NextResponse.json(current)

    const { data, error } = await supabase
      .from('recurring_transactions')
      .update({ next_run_date: nextOccurrence(current.next_run_date, current.frequency) })
      .eq('id', id).eq('user_id', user.id)
      .select().single()

    if (error) return supabaseError(error)
    return NextResponse.json(data)
  }

  const { amount, category_id, wallet_id, note, frequency, end_date, bank_fee, active } = body

  // Resuming a paused item skips whatever was missed while inactive — jump
  // next_run_date to the first FUTURE occurrence instead of letting the
  // cron backfill everything that piled up during the pause.
  let resumedNextRunDate: string | undefined
  if (active === true) {
    const { data: current } = await supabase
      .from('recurring_transactions')
      .select('next_run_date, frequency')
      .eq('id', id).eq('user_id', user.id).single()

    if (!current) return notFound('Recurring transaction not found.')

    if (current.next_run_date) {
      const today = localYMD()
      let next = current.next_run_date
      while (next <= today) next = nextOccurrence(next, current.frequency)
      resumedNextRunDate = next
    }
  }

  const { data, error } = await supabase
    .from('recurring_transactions')
    .update({
      amount: amount ? Number(amount) : undefined,
      category_id: category_id !== undefined ? (category_id || null) : undefined,
      wallet_id: wallet_id !== undefined ? (wallet_id || null) : undefined,
      note: note !== undefined ? (note?.trim() || null) : undefined,
      frequency: frequency || undefined,
      end_date: end_date !== undefined ? (end_date || null) : undefined,
      bank_fee: bank_fee !== undefined ? (Number(bank_fee) > 0 ? Number(bank_fee) : null) : undefined,
      active: active !== undefined ? !!active : undefined,
      next_run_date: resumedNextRunDate,
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return supabaseError(error)
  return NextResponse.json(data)
})

export const DELETE = withAuth<{ id: string }>(async (_request, { supabase, user, params }) => {
  const { id } = params

  const { error } = await supabase
    .from('recurring_transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return supabaseError(error)
  return noContent()
})
