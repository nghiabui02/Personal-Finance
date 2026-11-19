import { NextResponse } from 'next/server'
import { withAuth, rpcError } from '@/lib/server/route'
import { localYMD } from '@/lib/utils/date'
import { debtMovementRpcParams } from '@/lib/server/rpc-params'

export const POST = withAuth<{ id: string }>(async (request, { supabase, params }) => {
  const { id } = params
  const body = await request.json()

  // The addition record, the new totals and the wallet move together, so a
  // wallet that cannot cover a further loan leaves the debt untouched.
  const { data, error } = await supabase.rpc('add_to_debt', debtMovementRpcParams(id, body, localYMD()))

  if (error) return rpcError(error)

  return NextResponse.json(data, { status: 201 })
})
