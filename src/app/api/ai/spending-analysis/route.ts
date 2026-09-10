import Groq from 'groq-sdk'
import { NextResponse } from 'next/server'
import { withAuth, jsonError } from '@/lib/server/route'
import { localYMD } from '@/lib/utils/date'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export const POST = withAuth(async (request, { supabase, user }) => {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return jsonError(500, 'Groq not configured')

  const { periodLabel, period, totalIncome, totalExpense, categories, budgets, previous, topTransactions, timeline, netWorthInfo, force } = await request.json()
  const periodType: 'week' | 'month' | 'quarter' | 'year' = period ?? 'month'

  // Balance-sheet snapshot fetched server-side — the client only knows the
  // period's in/out flows, but sound advice needs the current position too
  const [{ data: walletRows }, { data: debtRows }, { data: goalRows }] = await Promise.all([
    supabase.from('wallets')
      .select('name, type, balance, credit_limit')
      .eq('user_id', user.id),
    supabase.from('debts')
      .select('type, remaining_amount, due_date')
      .eq('user_id', user.id).eq('status', 'active'),
    supabase.from('saving_goals')
      .select('name, target_amount, current_amount')
      .eq('user_id', user.id).eq('status', 'active'),
  ])

  const wallets = walletRows ?? []
  const liquidAssets = wallets
    .filter(w => w.type !== 'credit')
    .reduce((s, w) => s + Number(w.balance), 0)
  const creditWallets = wallets.filter(w => w.type === 'credit' && Number(w.credit_limit) > 0)
  const creditLimitTotal = creditWallets.reduce((s, w) => s + Number(w.credit_limit), 0)
  const creditUsed = creditWallets.reduce((s, w) => s + Math.max(0, Number(w.credit_limit) - Number(w.balance)), 0)
  const receivable = (debtRows ?? []).filter(d => d.type === 'lend')
    .reduce((s, d) => s + Number(d.remaining_amount), 0)
  const payable = (debtRows ?? []).filter(d => d.type === 'borrow')
    .reduce((s, d) => s + Number(d.remaining_amount), 0)
  const netWorth = liquidAssets + receivable - creditUsed - payable

  // Check DB cache (skip if force-refresh). Version prefix invalidates old
  // cached results whenever the prompt changes materially. Comparison period
  // (label + totals) is part of the key — switching "compare with" must miss
  // the cache, not silently return an analysis written for a different one.
  const prevForKey = previous as { label?: string; totalIncome?: number; totalExpense?: number } | undefined
  const compareKeyPart = prevForKey ? `${prevForKey.label ?? ''}::${prevForKey.totalIncome ?? 0}::${prevForKey.totalExpense ?? 0}` : 'none'
  const cacheKey = `v8::${periodType}::${periodLabel}::${totalIncome}::${totalExpense}::${netWorth}::${compareKeyPart}`
  if (!force) {
    const { data: cached } = await supabase
      .from('ai_insights_cache')
      .select('result')
      .eq('user_id', user.id)
      .eq('cache_key', cacheKey)
      .single()
    if (cached?.result) return NextResponse.json(cached.result)
  }

  const groq = new Groq({ apiKey })

  const net = totalIncome - totalExpense
  const fmt = (n: number) => n.toLocaleString('vi-VN')

  const cats = ((categories ?? []) as { name: string; icon: string | null; amount: number }[])
  const catList = cats
    .slice(0, 8)
    .map(c => {
      const pct = totalExpense > 0 ? ((c.amount / totalExpense) * 100).toFixed(0) : 0
      return `  - ${c.icon ?? ''} ${c.name}: ${fmt(c.amount)}đ (${pct}% of total spending)`
    })
    .join('\n')

  const typedBudgets = (budgets as { name: string; budgeted: number; spent: number }[] | undefined) ?? []
  const overBudget = typedBudgets.filter(b => b.spent > b.budgeted)
  const budgetSection = typedBudgets.length
    ? '\nBudgets:\n' + typedBudgets
        .map(b => {
          const over = b.spent > b.budgeted
          return `  - ${b.name}: spent ${fmt(b.spent)}đ / budget ${fmt(b.budgeted)}đ${over ? ' ⚠️ OVER BUDGET' : ''}`
        })
        .join('\n')
    : ''

  const savingsRate = totalIncome > 0 ? (((totalIncome - totalExpense) / totalIncome) * 100).toFixed(1) : '0'

  // Pre-compute derived stats so the model never does arithmetic itself
  const periodDays: Record<typeof periodType, number> = { week: 7, month: 30, quarter: 91, year: 365 }
  const avgPerDay = Math.round(totalExpense / periodDays[periodType])
  const topCat = cats[0]
  const topCatPct = topCat && totalExpense > 0 ? Math.round((topCat.amount / totalExpense) * 100) : 0
  const cutSuggestions = cats
    .filter(c => c.amount >= totalExpense * 0.15)
    .slice(0, 3)
    .map(c => `  - Cut 20% of "${c.name}" → save ~${fmt(Math.round(c.amount * 0.2))}đ`)
    .join('\n')

  // --- Balance-sheet metrics (all pre-computed, standard personal-finance ratios) ---

  // Normalize the period's expense to a monthly figure for runway math
  const monthlyExpenseFactor: Record<typeof periodType, number> = { week: 4.33, month: 1, quarter: 1 / 3, year: 1 / 12 }
  const monthlyExpense = Math.round(totalExpense * monthlyExpenseFactor[periodType])
  const runwayMonths = monthlyExpense > 0 ? liquidAssets / monthlyExpense : null
  const creditUtilPct = creditLimitTotal > 0 ? Math.round((creditUsed / creditLimitTotal) * 100) : null

  const goals = goalRows ?? []
  const goalTarget = goals.reduce((s, g) => s + Number(g.target_amount), 0)
  const goalCurrent = goals.reduce((s, g) => s + Number(g.current_amount), 0)
  const goalPct = goalTarget > 0 ? Math.round((goalCurrent / goalTarget) * 100) : null

  const overdueDebts = (debtRows ?? []).filter(d =>
    d.type === 'borrow' && Number(d.remaining_amount) > 0 && d.due_date && d.due_date < localYMD())

  const nwInfo = netWorthInfo as { current: number; changeAmount: number | null; changeDays: number | null } | undefined
  const netWorthChangeLine = nwInfo?.changeAmount != null && nwInfo.changeDays != null && nwInfo.changeDays > 0
    ? `Net worth change: ${nwInfo.changeAmount >= 0 ? 'UP' : 'DOWN'} ${fmt(Math.abs(nwInfo.changeAmount))}đ over the last ${nwInfo.changeDays} days`
    : ''

  const assetSection = [
    '\n=== CURRENT ASSETS & CASH POSITION (real balances, not this period\'s cash flow) ===',
    `Available cash (cash + bank + wallets): ${fmt(liquidAssets)}đ`,
    creditLimitTotal > 0
      ? `Credit card debt: ${fmt(creditUsed)}đ / limit ${fmt(creditLimitTotal)}đ (using ${creditUtilPct}% of limit)`
      : 'No credit cards.',
    receivable > 0 ? `Money lent out (not yet collected): ${fmt(receivable)}đ` : '',
    payable > 0 ? `Money borrowed (not yet repaid): ${fmt(payable)}đ${overdueDebts.length ? ` — ${overdueDebts.length} of these OVERDUE` : ''}` : '',
    `Net worth (available + lent − credit debt − borrowed): ${fmt(netWorth)}đ`,
    netWorthChangeLine,
    runwayMonths !== null
      ? `Emergency fund: available cash covers ${runwayMonths.toFixed(1)} months of spending (~${fmt(monthlyExpense)}đ/month run rate)`
      : 'Emergency fund not calculable yet (no spending this period).',
    goalPct !== null ? `Savings goals: ${fmt(goalCurrent)}đ / ${fmt(goalTarget)}đ (${goalPct}%) contributed across ${goals.length} goal(s)` : '',
    '',
    'Personal-finance reference standards (use to judge, do NOT recompute):',
    '  - Safe emergency fund: 3-6 months of expenses. Under 1 month is high risk.',
    '  - Credit card debt: keep under 30% of limit; over 80% is alarming.',
    '  - Priority order for surplus cash: (1) pay off overdue debt/credit card, (2) build emergency fund to 3 months, (3) contribute to savings goals.',
  ].filter(Boolean).join('\n')

  // Score computed here so the model never does arithmetic. Weeks are scored on
  // spending control vs the previous week — salary lands once a month, so a week
  // without income is normal, NOT a deficit. Other periods use the savings-rate band.
  const prev = previous as { label?: string; totalIncome: number; totalExpense: number; categories?: { name: string; amount: number }[] } | undefined
  let suggestedScore: number
  if (periodType === 'week') {
    const prevExpense = Number(prev?.totalExpense ?? 0)
    const expenseChange = prevExpense > 0 ? (totalExpense - prevExpense) / prevExpense : null
    suggestedScore =
      expenseChange === null ? 60 :
      expenseChange <= -0.1 ? 78 :
      expenseChange <=  0.1 ? 68 :
      expenseChange <=  0.3 ? 55 : 40
  } else {
    const rate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0
    suggestedScore =
      net < 0 ? 25 :
      rate >= 30 ? 90 :
      rate >= 20 ? 77 :
      rate >= 10 ? 62 : 47
  }
  suggestedScore -= 5 * overBudget.length
  if (nwInfo?.changeAmount != null && nwInfo.changeAmount > 0) suggestedScore += 4
  if (runwayMonths !== null) {
    if (runwayMonths >= 6) suggestedScore += 8
    else if (runwayMonths >= 3) suggestedScore += 4
    else if (runwayMonths < 1) suggestedScore -= 10
    else suggestedScore -= 4
  }
  if (creditUtilPct !== null) {
    if (creditUtilPct >= 80) suggestedScore -= 10
    else if (creditUtilPct >= 50) suggestedScore -= 5
  }
  if (netWorth < 0) suggestedScore -= 15
  if (overdueDebts.length > 0) suggestedScore -= 5
  suggestedScore = Math.max(0, Math.min(100, Math.round(suggestedScore)))

  const periodFocus: Record<typeof periodType, string> = {
    week:    'This is a WEEKLY analysis. IMPORTANT: salary is paid MONTHLY on a fixed day, so most weeks have NO income — that is normal, NEVER call it a "deficit" or judge it negatively for lacking income. Assess: total spending this week vs the comparison period (if given), the highest-spending day, the dominant category, net worth movement.',
    month:   'This is a MONTHLY analysis. Assess: savings rate, categories over budget, the dominant spending category, change vs the comparison period (if given).',
    quarter: 'This is a QUARTERLY analysis (3 months). Assess: the 3-month picture, which month spent the most, the most expensive category this quarter, savings rate, one concrete goal for next quarter.',
    year:    'This is a YEARLY analysis. Assess: overall financial health this year, yearly savings rate, the largest spending category, one concrete goal for next year.',
  }

  // --- Optional deep-analysis sections (sent by the Reports screen) ---

  // Comparison-period section — `previous` may be the immediately preceding
  // period OR an arbitrary one the user picked (Reports "compare with"
  // picker), so the wording must never assume adjacency ("kỳ trước").
  let comparisonSection = ''
  if (prev && (prev.totalIncome > 0 || prev.totalExpense > 0)) {
    const pctChange = (cur: number, old: number) => old > 0 ? Math.round(((cur - old) / old) * 100) : null
    const describe = (label: string, cur: number, old: number) => {
      const ch = pctChange(cur, old)
      return `${label} in comparison period: ${fmt(old)}đ${ch !== null ? ` → this period ${ch >= 0 ? 'up' : 'down'} ${Math.abs(ch)}%` : ''}`
    }
    const catChanges = cats
      .map(c => {
        const old = prev.categories?.find(p => p.name === c.name)?.amount ?? 0
        const ch = pctChange(c.amount, old)
        return ch !== null && Math.abs(ch) >= 15
          ? `  - ${c.name}: ${ch >= 0 ? 'up' : 'down'} ${Math.abs(ch)}% (${fmt(old)}đ → ${fmt(c.amount)}đ)`
          : null
      })
      .filter(Boolean)
      .slice(0, 4)
      .join('\n')
    comparisonSection = [
      `\n=== COMPARISON PERIOD${prev.label ? ` (${prev.label})` : ''} ===`,
      '(This may NOT be the immediately preceding period — do not call it "the previous period" or assume adjacency; refer to it by the name given above or as "the comparison period".)',
      describe('Expense', totalExpense, prev.totalExpense),
      describe('Income', totalIncome, prev.totalIncome),
      catChanges ? `Categories with a notable change (% already computed):\n${catChanges}` : '',
    ].filter(Boolean).join('\n')
  }

  // Timeline: peak spending day/month, pre-digested so the model reads facts, not raw series
  const tl = (timeline ?? []) as { label: string; income: number; expense: number }[]
  let timelineSection = ''
  if (tl.length) {
    if (periodType === 'week') {
      timelineSection = '\nDaily spending this week:\n' + tl.map(p => `  - ${p.label}: ${fmt(p.expense)}đ`).join('\n')
    } else if (periodType === 'month') {
      const top = [...tl].filter(p => p.expense > 0).sort((a, b) => b.expense - a.expense).slice(0, 3)
      const zeroDays = tl.filter(p => p.expense === 0).length
      if (top.length) {
        timelineSection = `\nHighest-spending day(s) this month: ${top.map(p => `day ${p.label} (${fmt(p.expense)}đ)`).join(', ')}. Days with no spending: ${zeroDays}.`
      }
    } else {
      timelineSection = '\nMonthly income/expense breakdown:\n' + tl.map(p => `  - ${p.label}: expense ${fmt(p.expense)}đ / income ${fmt(p.income)}đ`).join('\n')
    }
  }

  // Largest individual expenses — lets insights call out concrete purchases
  const bigTxs = (topTransactions ?? []) as { note: string | null; category: string | null; amount: number; date: string }[]
  const topTxSection = bigTxs.length
    ? '\nLargest individual expenses this period:\n' + bigTxs
        .map(t => `  - ${t.note || 'No note'}${t.category ? ` [${t.category}]` : ''}: ${fmt(t.amount)}đ (${t.date})`)
        .join('\n')
    : ''

  const system = [
    'You are a personal finance advisor for a Vietnamese user (currency unit: đồng, symbol "đ").',
    'You receive a PERSONAL FINANCE REPORT with 2 parts: (1) this period\'s cash flow (income/expense), (2) current assets & debts (balance sheet). Advice must connect both — e.g. how this period\'s spending affects the emergency fund, where surplus cash should go first.',
    '',
    'Mandatory rules:',
    '- ONLY use the figures given in this message. Never invent numbers, never compute percentages yourself — every number and % you need is already calculated.',
    '- Only discuss trends/comparisons if a "COMPARISON PERIOD" section is present — that period may NOT be the immediately preceding one, read its note carefully for how to refer to it correctly. Only mention specific transactions or dates if they appear in the data.',
    '- Every insight must reference a specific category name or a real number. No generic advice like "spend more wisely", "track your spending", "consider cutting back".',
    '- Friendly, natural tone, address the user as "bạn". Each insight is at most 2 short sentences.',
    '- Money format: 1.234.567đ. Never write "VND".',
    '- Write ALL user-facing text (summary, topSpend, assets, insights[].text) in VIETNAMESE — the user is Vietnamese. These instructions are in English only to help you follow them precisely; your output content must not be.',
    '- Return raw JSON matching the schema, no markdown, no extra commentary.',
  ].join('\n')

  const userMsg = [
    periodFocus[periodType],
    '',
    `=== PERIOD DATA: ${periodLabel} ===`,
    `Income: ${fmt(totalIncome)}đ`,
    `Expense: ${fmt(totalExpense)}đ (average ${fmt(avgPerDay)}đ/day)`,
    periodType === 'week'
      ? `Income − expense this week: ${net >= 0 ? '+' : '−'}${fmt(Math.abs(net))}đ (salary is paid monthly on a fixed day — a week with no salary is NORMAL, not a deficit)`
      : net >= 0
        ? `Savings: ${fmt(net)}đ (${savingsRate}% of income)`
        : `DEFICIT: ${fmt(-net)}đ (spending exceeded income)`,
    overBudget.length ? `Categories over budget: ${overBudget.map(b => `${b.name} (over by ${fmt(b.spent - b.budgeted)}đ)`).join(', ')}` : 'No categories over budget.',
    '',
    'Top spending categories (up to 8, % of total spending — may not add up to 100%):',
    catList || '  (no spending transactions yet)',
    budgetSection,
    timelineSection,
    topTxSection,
    comparisonSection,
    assetSection,
    cutSuggestions ? `\nPre-computed cost-cutting suggestions (use these exact numbers if writing a cost-cutting tip):\n${cutSuggestions}` : '',
    '',
    '=== OUTPUT JSON ===',
    '{',
    periodType === 'week'
      ? '  "summary": "1-2 sentences in Vietnamese: total spending this week, vs the comparison period (if data given), the dominant category. Do NOT mention a deficit or weekly savings rate.",'
      : '  "summary": "1-2 sentences in Vietnamese: this period\'s situation, savings rate, dominant category",',
    `  "topSpend": "in Vietnamese, based exactly on the first line of the category list — e.g.: ${topCat ? `${topCat.name} chiếm ${topCatPct}% chi tiêu (${fmt(topCat.amount)}đ)` : 'Ăn uống chiếm 45% chi tiêu (2.250.000đ)'}",`,
    '  "assets": "1-2 sentences in Vietnamese assessing current asset health: net worth, emergency fund coverage in months, debt (if any) — use the exact figures from the ASSETS & CASH POSITION section",',
    '  "insights": [',
    '    { "emoji": "<emoji matching the content>", "text": "<insight in Vietnamese>", "type": "warning|tip|good" }',
    '  ],',
    `  "score": ${suggestedScore}`,
    '}',
    '',
    '=== RULES ===',
    '1. 4-6 insights, each making ONE distinct point, no overlap between them, don\'t repeat the summary.',
    periodType === 'week'
      ? '2. "warning" ONLY for a real issue in the data: over budget, spending up sharply (≥30%) vs the comparison period, one category over 40% of total spending, emergency fund under 1 month, credit card over 80% of limit, overdue debt, or negative net worth. NEVER warn just because the week has no income. If finances look healthy, do NOT fabricate a warning — use "good".'
      : '2. "warning" ONLY for a real issue in the data: over budget, deficit, savings rate under 10%, one category over 40% of total spending, emergency fund under 1 month, credit card over 80% of limit, overdue debt, or negative net worth. If finances look healthy, do NOT fabricate a warning — use "good" to acknowledge it.',
    '3. Every over-budget category must get its own warning stating the amount over.',
    '4. Include at least one actionable "tip". If it\'s a cost-cutting tip, use the exact numbers from "Pre-computed cost-cutting suggestions".',
    comparisonSection ? '4b. Include at least one insight about the most notable change vs the comparison period, using the exact % pre-computed in the COMPARISON PERIOD section, and refer to that period by its correct name (do not default to "the previous period" unless its note confirms that\'s accurate).' : '',
    '4c. Include at least one insight connecting this period\'s cash flow to current assets and looking FORWARD, following the "priority order for surplus cash": where money saved this period should go first (pay overdue debt/credit card → build emergency fund to 3 months → contribute to savings goals). If in deficit, state clearly what the shortfall is eating into (available cash / emergency fund).',
    '4d. If the emergency fund is under 3 months: state exactly how many months it currently covers (pre-computed number) and that the safe range is 3-6 months. If already at 3-6+ months: acknowledge it with one "good" insight.',
    '5. Emoji must match the content, never reuse the same emoji twice.',
    `6. "score" must be exactly ${suggestedScore} — already computed from savings rate, budgets, emergency fund, credit usage, and net worth. Do not recompute it.`,
    '7. If there are no spending transactions this period: the summary should encourage the user to start tracking, include 2 tips to get started, and still assess the asset section in "assets".',
  ].filter(Boolean).join('\n')

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const completion = await groq.chat.completions.create({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userMsg },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4,
      })
      const data = JSON.parse(completion.choices[0].message.content ?? '{}')

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
