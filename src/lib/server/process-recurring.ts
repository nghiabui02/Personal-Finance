import { SupabaseClient } from '@supabase/supabase-js'

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function nextRunDate(current: string, frequency: string): string {
  const d = new Date(current + 'T00:00:00')
  switch (frequency) {
    case 'daily':   d.setDate(d.getDate() + 1); break
    case 'weekly':  d.setDate(d.getDate() + 7); break
    case 'monthly': d.setMonth(d.getMonth() + 1); break
    case 'yearly':  d.setFullYear(d.getFullYear() + 1); break
  }
  return toYMD(d)
}

async function adjustBalance(
  supabase: SupabaseClient,
  walletId: string,
  delta: number,
  userId: string,
) {
  await supabase.rpc('adjust_wallet_balance', {
    p_wallet_id: walletId,
    p_delta: delta,
    p_user_id: userId,
  })
}

/**
 * Checks all recurring transactions due today or earlier and creates the missing transactions.
 * Called lazily when the user opens the dashboard.
 * Returns the number of transactions created.
 */
export async function processRecurring(supabase: SupabaseClient, userId: string): Promise<number> {
  const today = toYMD(new Date())

  const { data: due } = await supabase
    .from('recurring_transactions')
    .select('*')
    .eq('user_id', userId)
    .lte('next_run_date', today)
    .or(`end_date.is.null,end_date.gte.${today}`)

  if (!due?.length) return 0

  let created = 0

  for (const item of due) {
    let runDate: string = item.next_run_date

    // Create all missed occurrences up to today
    while (runDate <= today) {
      if (item.end_date && runDate > item.end_date) break

      await supabase.from('transactions').insert({
        user_id: userId,
        type: item.type,
        amount: item.amount,
        category_id: item.category_id ?? null,
        wallet_id: item.wallet_id ?? null,
        transaction_date: runDate,
        note: item.note ?? null,
        is_recurring: true,
        recurring_id: item.id,
      })

      if (item.wallet_id) {
        const delta = item.type === 'income' ? Number(item.amount) : -Number(item.amount)
        await adjustBalance(supabase, item.wallet_id, delta, userId)
      }

      created++
      runDate = nextRunDate(runDate, item.frequency)
    }

    // Update next_run_date (or mark done if past end_date)
    if (item.end_date && runDate > item.end_date) {
      await supabase.from('recurring_transactions')
        .update({ next_run_date: runDate }).eq('id', item.id)
    } else {
      await supabase.from('recurring_transactions')
        .update({ next_run_date: runDate }).eq('id', item.id)
    }
  }

  return created
}
