import { readAllById } from './read-all-by-id'
import { CATEGORY_RELATION } from '@/lib/category-columns'
import { getMonthlyExpenses } from './transaction-reporting'
import type { SupabaseClient } from '@supabase/supabase-js'
import { monthRange } from '@/lib/utils/date'
import type { CategoryRef } from '@/lib/types'

type BudgetWithRollover = {
  id: string
  user_category_id: string | null
  amount: number
  month: string
  rollover: boolean
  active: boolean
  spent: number
  rolloverCarry: number    // + surplus carried in, - deficit carried in
  effectiveAmount: number  // amount + rolloverCarry — the real limit for this month
  categories: CategoryRef | null
}

function isNextMonth(a: string, b: string): boolean {
  const [ay, am] = a.split('-').map(Number)
  const [by, bm] = b.split('-').map(Number)
  return (ay === by && bm === am + 1) || (by === ay + 1 && am === 12 && bm === 1)
}

// Budgets for one month, with rollover carried forward from prior months
// computed at read time — no stored running total, no cron. Only categories
// with rollover=true this month pay the cost of walking their history.
export async function getBudgetsForMonth(
  supabase: SupabaseClient,
  userId: string,
  month: string, // YYYY-MM
): Promise<BudgetWithRollover[]> {
  const { startDate, endDate } = monthRange(month)

  // Inactive rows for the target month are still returned (client shows them
  // in a separate tab so they can be reactivated) — just excluded from totals
  // and rollover math below.
  const current = await readAllById('monthly budgets', () => supabase
    .from('budgets')
    .select(`id, created_at, user_category_id, amount, month, rollover, active, ${CATEGORY_RELATION}`, { count: 'exact' })
    .eq('user_id', userId)
    .eq('month', startDate)
  )
  current.sort((a, b) => a.created_at.localeCompare(b.created_at))

  if (!current.length) return []

  const currentExpenses = await getMonthlyExpenses(supabase, startDate, endDate)

  const spentThisMonth = new Map<string, number>()
  for (const tx of currentExpenses) {
    if (!tx.user_category_id) continue
    spentThisMonth.set(tx.user_category_id, (spentThisMonth.get(tx.user_category_id) ?? 0) + Number(tx.amount))
  }

  const rolloverCategoryIds = [...new Set(
    current.filter(b => b.active && b.rollover && b.user_category_id).map(b => b.user_category_id!)
  )]

  const carryByCategoryId = new Map<string, number>()
  if (rolloverCategoryIds.length) {
    const history = await readAllById('rollover budgets', () => supabase
      .from('budgets')
      .select('id, user_category_id, month, amount, rollover', { count: 'exact' })
      .eq('user_id', userId)
      .eq('active', true)
      .in('user_category_id', rolloverCategoryIds)
      .lt('month', startDate)
    )
    history.sort((a, b) => a.month.localeCompare(b.month))

    const earliestMonth = history[0]?.month
    const historyExpensesByCatMonth = new Map<string, number>()
    if (earliestMonth) {
      const histExpenses = await getMonthlyExpenses(supabase, earliestMonth, startDate, rolloverCategoryIds)
      for (const tx of histExpenses) {
        if (!tx.user_category_id) continue
        const key = `${tx.user_category_id}::${tx.transaction_date.slice(0, 7)}`
        historyExpensesByCatMonth.set(key, (historyExpensesByCatMonth.get(key) ?? 0) + Number(tx.amount))
      }
    }

    const historyByCategory = new Map<string, typeof history>()
    for (const row of history) {
      if (!row.user_category_id) continue
      const list = historyByCategory.get(row.user_category_id) ?? []
      list.push(row)
      historyByCategory.set(row.user_category_id, list)
    }

    for (const categoryId of rolloverCategoryIds) {
      const rows = historyByCategory.get(categoryId) ?? []

      let leftover = 0
      let prevMonthKey: string | null = null
      for (const row of rows) {
        const monthKey = row.month.slice(0, 7)
        if (prevMonthKey && !isNextMonth(prevMonthKey, monthKey)) leftover = 0 // gap month breaks the chain
        const carryIn = row.rollover ? leftover : 0
        const effective = Number(row.amount) + carryIn
        const spent = historyExpensesByCatMonth.get(`${categoryId}::${monthKey}`) ?? 0
        leftover = effective - spent
        prevMonthKey = monthKey
      }
      // Chain must reach the month right before target — else there's a gap, no carry
      carryByCategoryId.set(categoryId, prevMonthKey && isNextMonth(prevMonthKey, month) ? leftover : 0)
    }
  }

  return current.map(b => {
    const spent = b.user_category_id ? (spentThisMonth.get(b.user_category_id) ?? 0) : 0
    const rolloverCarry = (b.active && b.rollover && b.user_category_id) ? (carryByCategoryId.get(b.user_category_id) ?? 0) : 0
    return {
      id: b.id,
      user_category_id: b.user_category_id,
      amount: Number(b.amount),
      month: b.month,
      rollover: b.rollover,
      active: b.active,
      spent,
      rolloverCarry,
      effectiveAmount: Number(b.amount) + rolloverCarry,
      categories: b.categories as unknown as CategoryRef | null,
    }
  })
}
