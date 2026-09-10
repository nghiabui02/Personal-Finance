import { NextResponse } from 'next/server'
import { withAuth, badRequest } from '@/lib/server/route'
import { getPeriodSummary } from '@/lib/server/period-summary'
import type { PeriodType } from '@/lib/utils/period'

const VALID_PERIODS: PeriodType[] = ['week', 'month', 'quarter', 'year']

// Totals for an arbitrary period — powers the "compare with" picker in AI Insights.
export const GET = withAuth(async (request, { supabase, user }) => {
  const period = request.nextUrl.searchParams.get('period')
  const start = request.nextUrl.searchParams.get('start')

  if (!period || !VALID_PERIODS.includes(period as PeriodType)) return badRequest('Invalid period.')
  if (!start || !/^\d{4}-\d{2}-\d{2}$/.test(start)) return badRequest('Invalid start date.')

  const summary = await getPeriodSummary(supabase, user.id, period as PeriodType, start)
  return NextResponse.json(summary)
})
