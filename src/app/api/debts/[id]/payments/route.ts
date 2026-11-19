import { NextResponse } from 'next/server'
import { withAuth, rpcError, supabaseError } from '@/lib/server/route'
import { localYMD } from '@/lib/utils/date'
import { debtMovementRpcParams } from '@/lib/server/rpc-params'

export const POST = withAuth<{ id: string }>(async (request, { supabase, params }) => {
  const { id } = params
  const body = await request.json()

  // The wallet is checked before the payment record and the debt change, so a
  // wallet that cannot cover the payment leaves the debt exactly as it was.
  const { data, error } = await supabase.rpc('record_debt_payment', debtMovementRpcParams(id, body, localYMD()))

  if (error) return rpcError(error)
  if (!data) return supabaseError({ message: 'Payment did not return a result.' })

  return NextResponse.json(data, { status: 201 })
})
