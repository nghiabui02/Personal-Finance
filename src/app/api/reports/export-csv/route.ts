import { getReportingGroup, summarizeNonOperatingFlows } from '@/lib/server/transaction-reporting'
import { getBudgetsForMonth } from '@/lib/server/budget-rollover'
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/server/route'
import { toYMD } from '@/lib/utils/date'

function esc(v: string | number | null | undefined): string {
  const s = String(v ?? '')
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

function row(...cells: (string | number | null | undefined)[]): string {
  return cells.map(esc).join(',')
}

function fmt(n: number): string {
  return n.toLocaleString('vi-VN')
}

function getDateRange(period: string, start: string): { startDate: string; endDate: string } {
  if (period === 'week') {
    const end = new Date(start + 'T00:00:00')
    end.setDate(end.getDate() + 7)
    return { startDate: start, endDate: toYMD(end) }
  }
  if (period === 'month') {
    const [y, m] = start.split('-').map(Number)
    return { startDate: start, endDate: toYMD(new Date(y, m, 1)) }
  }
  if (period === 'quarter') {
    const [y, m] = start.split('-').map(Number)
    return { startDate: start, endDate: toYMD(new Date(y, m - 1 + 3, 1)) }
  }
  const y = parseInt(start)
  return { startDate: `${y}-01-01`, endDate: `${y + 1}-01-01` }
}

export const GET = withAuth(async (request, { supabase, user }) => {
  const { searchParams } = request.nextUrl
  const period = searchParams.get('period') ?? 'month'
  const start  = searchParams.get('start') ?? toYMD(new Date())
  const { startDate, endDate } = getDateRange(period, start)

  const [{ data: txRows }, { data: walletRows }] = await Promise.all([
    supabase
      .from('transactions')
      .select('id, type, amount, note, transaction_date, payment_method, transfer_pair_id, categories(name, icon, system_key), wallets(name)')
      .eq('user_id', user.id)
      .gte('transaction_date', startDate)
      .lt('transaction_date', endDate)
      .order('transaction_date', { ascending: true })
      .order('created_at', { ascending: true }),

    supabase
      .from('wallets')
      .select('name, balance, type')
      .eq('user_id', user.id),
  ])

  type TxRow = {
    id: string
    type: 'income' | 'expense'
    amount: number
    note: string | null
    transaction_date: string
    payment_method: string | null
    transfer_pair_id: string | null
    categories: { name: string; icon: string | null; system_key: string | null } | null
    wallets: { name: string } | null
  }
  const txs = (txRows ?? []) as unknown as TxRow[]

  // Export totals follow the same operating classification as the report screen.
  const flowTxs = txs.filter(tx => getReportingGroup(tx) === 'operating')
  const nonOperatingFlows = summarizeNonOperatingFlows(txs)

  const totalIncome  = flowTxs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpense = flowTxs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const net          = totalIncome - totalExpense
  const savingsRate  = totalIncome > 0 ? ((net / totalIncome) * 100).toFixed(1) : '0'

  // Category breakdown
  const catMap = new Map<string, { amount: number; count: number }>()
  for (const t of flowTxs.filter(t => t.type === 'expense')) {
    const name = t.categories?.name ?? 'Uncategorized'
    const prev = catMap.get(name) ?? { amount: 0, count: 0 }
    catMap.set(name, { amount: prev.amount + Number(t.amount), count: prev.count + 1 })
  }
  const catList = [...catMap.entries()].sort((a, b) => b[1].amount - a[1].amount)

  // Time breakdown — group by day for week/month, by month for quarter/year
  const groupKey = (date: string) =>
    (period === 'quarter' || period === 'year') ? date.slice(0, 7) : date

  const timeMap = new Map<string, { income: number; expense: number }>()
  for (const t of flowTxs) {
    const key = groupKey(t.transaction_date)
    const prev = timeMap.get(key) ?? { income: 0, expense: 0 }
    if (t.type === 'income') timeMap.set(key, { ...prev, income: prev.income + Number(t.amount) })
    else timeMap.set(key, { ...prev, expense: prev.expense + Number(t.amount) })
  }
  const timeList = [...timeMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  const timeLabel = (period === 'quarter' || period === 'year') ? 'Month' : 'Date'

  // Budget comparison — same source as the Reports screen, so the two agree.
  // Budgets are monthly, so they only line up with the month view. Reading
  // `budgets.amount` straight from the table would also ignore rollover carry
  // and paused rows, and over a quarter or year it would pick one arbitrary
  // month's row per category.
  const budgets = period === 'month'
    ? (await getBudgetsForMonth(supabase, user.id, start.slice(0, 7))).filter(b => b.active)
    : []

  const lines: string[] = []

  // ── SECTION 1: SUMMARY ─────────────────────────────────────────
  lines.push('=== PERSONAL FINANCE REPORT ===')
  lines.push(row('Report period', `${period.toUpperCase()}: ${startDate} → ${endDate}`))
  lines.push(row('Exported at', new Date().toLocaleString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })))
  lines.push('')
  lines.push('=== SUMMARY ===')
  lines.push(row('Metric', 'Value'))
  lines.push(row('Total income', `${fmt(totalIncome)}đ`))
  lines.push(row('Total expense', `${fmt(totalExpense)}đ`))
  lines.push(row('Net (income - expense)', `${net >= 0 ? '+' : ''}${fmt(net)}đ`))
  lines.push(row('Savings rate', `${savingsRate}%`))
  lines.push(row('Transactions (incl. transfers)', txs.length))
  lines.push(row('Income transactions', flowTxs.filter(t => t.type === 'income').length))
  lines.push(row('Expense transactions', flowTxs.filter(t => t.type === 'expense').length))
  lines.push('')

  lines.push('=== DEBT CASH FLOW AND BALANCE ADJUSTMENTS ===')
  lines.push(row('Borrowing and debt collections', fmt(nonOperatingFlows.debtIncome)))
  lines.push(row('Lending and principal repayments', fmt(nonOperatingFlows.debtExpense)))
  lines.push(row('Balance increases', fmt(nonOperatingFlows.adjustmentIncome)))
  lines.push(row('Balance decreases', fmt(nonOperatingFlows.adjustmentExpense)))
  lines.push(row('Net cash flow including debt', fmt(net + nonOperatingFlows.debtIncome - nonOperatingFlows.debtExpense)))
  lines.push('')

  // ── SECTION 2: WALLETS ─────────────────────────────────────────
  if (walletRows?.length) {
    lines.push('=== WALLET BALANCES ===')
    lines.push(row('Wallet', 'Type', 'Balance'))
    for (const w of walletRows as { name: string; balance: number; type: string }[]) {
      lines.push(row(w.name, w.type, `${fmt(Number(w.balance))}đ`))
    }
    lines.push('')
  }

  // ── SECTION 3: CATEGORY BREAKDOWN ─────────────────────────────
  lines.push('=== SPENDING BY CATEGORY ===')
  lines.push(row('Category', 'Total spent', '% of spending', 'Transactions', 'Avg / transaction', 'Budget', 'Remaining'))
  for (const [name, { amount, count }] of catList) {
    const pct = totalExpense > 0 ? ((amount / totalExpense) * 100).toFixed(1) + '%' : '0%'
    const avg = count > 0 ? Math.round(amount / count) : 0
    const budget = budgets.find(b => b.categories?.name === name)
    const budgetAmt = budget ? Number(budget.effectiveAmount) : null
    const remaining = budgetAmt !== null ? budgetAmt - amount : null
    lines.push(row(
      name,
      `${fmt(amount)}đ`,
      pct,
      count,
      `${fmt(avg)}đ`,
      budgetAmt !== null ? `${fmt(budgetAmt)}đ` : 'Not set',
      remaining !== null ? `${remaining >= 0 ? '+' : ''}${fmt(remaining)}đ` : '-',
    ))
  }
  lines.push('')

  // ── SECTION 4: TIME BREAKDOWN ─────────────────────────────────
  lines.push(`=== SPENDING BY ${timeLabel.toUpperCase()} ===`)
  lines.push(row(timeLabel, 'Income', 'Expense', 'Net'))
  for (const [key, { income, expense }] of timeList) {
    lines.push(row(key, `${fmt(income)}đ`, `${fmt(expense)}đ`, `${income - expense >= 0 ? '+' : ''}${fmt(income - expense)}đ`))
  }
  lines.push('')

  // ── SECTION 5: ALL TRANSACTIONS ───────────────────────────────
  lines.push('=== ALL TRANSACTIONS ===')
  lines.push(row('Date', 'Type', 'Reporting group', 'Category', 'Amount', 'Wallet', 'Payment method', 'Note'))
  for (const t of txs) {
    lines.push(row(
      t.transaction_date,
      t.type === 'income' ? 'Income' : 'Expense',
      getReportingGroup(t),
      t.categories?.name ?? 'Uncategorized',
      `${fmt(Number(t.amount))}đ`,
      t.wallets?.name ?? '-',
      t.payment_method ?? '-',
      t.note ?? '',
    ))
  }

  const csv = lines.join('\n')
  const filename = `finance-report_${period}_${startDate}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
})
