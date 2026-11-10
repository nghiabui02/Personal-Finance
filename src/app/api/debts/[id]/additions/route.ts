import { NextResponse } from 'next/server'
import { withAuth, rpcError } from '@/lib/server/route'
import { ensureSystemCategory } from '@/lib/server/system-categories'
import { localYMD } from '@/lib/utils/date'
import { debtMovementRpcParams } from '@/lib/server/rpc-params'

export const POST = withAuth<{ id: string }>(async (request, { supabase, user, params }) => {
  const { id } = params
  const body = await request.json()

  const { data: debt } = await supabase
    .from('debts')
    .select('type')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  const categoryId = debt && body.wallet_id
    ? await ensureSystemCategory(supabase, user.id, debt.type === 'lend' ? 'lend_out' : 'borrow_in')
    : null

  // The addition record, the new totals and the wallet move together, so a
  // wallet that cannot cover a further loan leaves the debt untouched.
  const { data, error } = await supabase.rpc('add_to_debt', debtMovementRpcParams(id, body, categoryId, localYMD()))

  if (error) return rpcError(error)

  return NextResponse.json(data, { status: 201 })
})
