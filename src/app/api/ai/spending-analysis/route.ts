import type { SupabaseClient } from '@supabase/supabase-js'
import { getNonOperatingCategoryIds, onlyOperatingTransactions } from '@/lib/server/transaction-reporting'
import { NextResponse } from 'next/server'
import { withAuth, jsonError, tooManyRequests } from '@/lib/server/route'
import { isRateLimited, ONE_MINUTE_MS } from '@/lib/server/rate-limit'
import { askForJson, createGroqClient } from '@/lib/server/groq'
import { localYMD, shiftLocalDate } from '@/lib/utils/date'
import { sumAmounts } from '@/lib/utils/totals'
import { summarizeBalanceSheet, type PeriodType } from '@/lib/server/spending-analysis'
import { buildAnalysisPrompt } from '@/lib/server/spending-analysis-prompt'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// Every uncached call is a paid model request, retried up to three times.
// Browsing periods stays well under this; a stuck client does not.
const ANALYSES_PER_MINUTE = 20

/** Operating expense of the week before the one starting at `weekStart`. The
 *  score always compares with that week, never with the comparison period the
 *  user picked, so it does not jump around as they browse comparisons. */
async function getPreviousWeekExpense(
  supabase: SupabaseClient,
  userId: string,
  weekStart: string,
  excludedCategoryIds: string[],
): Promise<number> {
  const { data } = await onlyOperatingTransactions(supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', userId).eq('type', 'expense')
    .gte('transaction_date', shiftLocalDate(weekStart, -7))
    .lt('transaction_date', weekStart), excludedCategoryIds)
  return sumAmounts(data ?? [])
}

export const POST = withAuth(async (request, { supabase, user }) => {
  if (isRateLimited(request, { key: `ai-analysis:${user.id}`, limit: ANALYSES_PER_MINUTE, windowMs: ONE_MINUTE_MS })) {
    return tooManyRequests('Too many requests. Try again in a minute.')
  }

  const groq = createGroqClient()
  if (!groq) return jsonError(500, 'Groq is not configured.')

  const { periodLabel, period, start, totalIncome, totalExpense, categories, budgets, previous, topTransactions, timeline, netWorthInfo, force } = await request.json()
  const periodType: PeriodType = period ?? 'month'

  const excludedCategoryIds = await getNonOperatingCategoryIds(supabase, user.id)

  // Balance-sheet snapshot fetched server-side — the client only knows the
  // period's in/out flows, but sound advice needs the current position too
  const [{ data: walletRows }, { data: debtRows }, { data: goalRows }, { data: recentExpenseRows }] = await Promise.all([
    supabase.from('wallets')
      .select('name, type, balance, credit_limit')
      .eq('user_id', user.id),
    supabase.from('debts')
      .select('type, remaining_amount, due_date')
      .eq('user_id', user.id).eq('status', 'active'),
    supabase.from('saving_goals')
      .select('name, target_amount, current_amount')
      .eq('user_id', user.id).eq('status', 'active'),
    // Last 90 days of real spending — the emergency-fund run rate must come
    // from a stable trailing average, NOT from extrapolating the viewed period
    // (one heavy shopping week × 4.33 would fake a run rate and wreck the score).
    onlyOperatingTransactions(supabase.from('transactions')
      .select('amount')
      .eq('user_id', user.id).eq('type', 'expense')
      .gte('transaction_date', shiftLocalDate(localYMD(), -90))
      .lt('transaction_date', localYMD()), excludedCategoryIds),
  ])

  const sheet = summarizeBalanceSheet(walletRows, debtRows)
  const { netWorth } = sheet

  // Check DB cache (skip if force-refresh). Version prefix invalidates old
  // cached results whenever the prompt changes materially. Comparison period
  // (label + totals) is part of the key — switching "compare with" must miss
  // the cache, not silently return an analysis written for a different one.
  const prevForKey = previous as { label?: string; totalIncome?: number; totalExpense?: number } | undefined
  const compareKeyPart = prevForKey ? `${prevForKey.label ?? ''}::${prevForKey.totalIncome ?? 0}::${prevForKey.totalExpense ?? 0}` : 'none'
  const cacheKey = `v10::${periodType}::${periodLabel}::${totalIncome}::${totalExpense}::${netWorth}::${compareKeyPart}`
  if (!force) {
    const { data: cached } = await supabase
      .from('ai_insights_cache')
      .select('result')
      .eq('user_id', user.id)
      .eq('cache_key', cacheKey)
      .single()
    if (cached?.result) return NextResponse.json(cached.result)
  }

  const prevWeekExpense = periodType === 'week'
    ? await getPreviousWeekExpense(supabase, user.id, typeof start === 'string' ? start : localYMD(), excludedCategoryIds)
    : 0

  const { system, user: userMsg } = buildAnalysisPrompt({
    periodType, periodLabel, start, totalIncome, totalExpense, categories, budgets, previous,
    topTransactions, timeline, netWorthInfo, sheet, debtRows, goalRows, recentExpenseRows, prevWeekExpense,
  })

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const data = await askForJson(groq, { system, user: userMsg, temperature: 0.4 })

      await supabase.from('ai_insights_cache').upsert({
        user_id: user.id,
        cache_key: cacheKey,
        result: data,
        created_at: new Date().toISOString(),
      }, { onConflict: 'user_id,cache_key' })

      return NextResponse.json(data)
    } catch (err: unknown) {
      const e = err as { status?: number }
      if (e?.status === 429 && attempt < 2) {
        await sleep((attempt + 1) * 4000)
        continue
      }
      console.error('[AI spending analysis]', err)
      if (e?.status === 429) {
        return jsonError(429, 'rate_limit')
      }
      return jsonError(500, 'Analysis failed')
    }
  }

  return jsonError(500, 'Analysis failed')
})
