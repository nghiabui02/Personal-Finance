import { NextResponse } from 'next/server'
import { withAuth, rpcError, supabaseError } from '@/lib/server/route'
import { ensureSystemCategory } from '@/lib/server/system-categories'
import { localYMD } from '@/lib/utils/date'
import { debtMovementRpcParams } from '@/lib/server/rpc-params'
import { getOwnedDebtType } from '@/lib/server/debts'

export const POST = withAuth<{ id: string }>(async (request, { supabase, user, params }) => {
  const { id } = params
  const body = await request.json()

  // Which direction this lands in depends on the debt, so the category has to
  // be resolved before the money moves. Creating it changes no balance, so it
  // is safe to leave outside the transaction below.
  const debtType = await getOwnedDebtType(supabase, user.id, id)

  const categoryId = debtType
    ? await ensureSystemCategory(supabase, user.id, debtType === 'lend' ? 'collect_debt' : 'repay_debt')
    : null

  // The wallet is checked before the payment record and the debt change, so a
  // wallet that cannot cover the payment leaves the debt exactly as it was.
  const { data, error } = await supabase.rpc('record_debt_payment', debtMovementRpcParams(id, body, categoryId, localYMD()))

  if (error) return rpcError(error)
  if (!data) return supabaseError({ message: 'Payment did not return a result.' })

  return NextResponse.json(data, { status: 201 })
})
