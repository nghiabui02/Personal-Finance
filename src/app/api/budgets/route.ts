import { CATEGORY_RELATION } from '@/lib/category-columns'
import { NextResponse } from 'next/server'
import { withAuth, badRequest, conflict, rpcError } from '@/lib/server/route'

export const POST = withAuth(async (request, { supabase, user }) => {
  const body = await request.json()
  if (Object.hasOwn(body, 'category_id')) return badRequest('categoryContractChanged')
  const { user_category_id, amount, month, rollover, active } = body

  if (!amount || Number(amount) <= 0) return badRequest('amountIsRequired')
  if (!month) return badRequest('monthIsRequired')

  const { data, error } = await supabase
    .from('budgets')
    .insert({ user_id: user.id, user_category_id: user_category_id || null, amount: Number(amount), month, rollover: !!rollover, active: active === undefined ? true : !!active })
    .select(`*, ${CATEGORY_RELATION}`)
    .single()

  if (error) {
    if (error.code === '23505') return conflict('aBudgetForThisCategoryAlreadyExistsInThisMonth')
    return rpcError(error)
  }

  return NextResponse.json(data, { status: 201 })
})
