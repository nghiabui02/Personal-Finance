import { NextResponse } from 'next/server'
import { withAuth, badRequest, conflict, supabaseError } from '@/lib/server/route'

export const POST = withAuth(async (request, { supabase, user }) => {
  const body = await request.json()
  const { category_id, amount, month, rollover, active } = body

  if (!amount || Number(amount) <= 0) return badRequest('amountIsRequired')
  if (!month) return badRequest('monthIsRequired')

  const { data, error } = await supabase
    .from('budgets')
    .insert({ user_id: user.id, category_id: category_id || null, amount: Number(amount), month, rollover: !!rollover, active: active === undefined ? true : !!active })
    .select('*, categories(id, name, icon, color, default_key, name_is_custom, system_key)')
    .single()

  if (error) {
    if (error.code === '23505') return conflict('aBudgetForThisCategoryAlreadyExistsInThisMonth')
    return supabaseError(error)
  }

  return NextResponse.json(data, { status: 201 })
})
