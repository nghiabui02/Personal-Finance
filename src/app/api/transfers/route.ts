import { NextResponse } from 'next/server'
import { withAuth, rpcError } from '@/lib/server/route'
import { scalarResult } from '@/lib/server/rpc-result'
import { localYMD } from '@/lib/utils/date'

export const POST = withAuth(async (request, { supabase }) => {
  const { from_wallet_id, to_wallet_id, amount, note, transfer_date } = await request.json()

  // Both wallets are locked for the duration, so two transfers issued at the
  // same moment can no longer both pass the balance check and overdraw.
  const { data, error } = await supabase.rpc('transfer_funds', {
    p_from_wallet_id: from_wallet_id ?? null,
    p_to_wallet_id: to_wallet_id ?? null,
    p_amount: Number(amount),
    p_date: transfer_date || localYMD(),
    p_note: note ?? null,
  })

  if (error) return rpcError(error)

  return NextResponse.json(
    { success: true, transfer_pair_id: scalarResult<string>(data, 'transfer_pair_id') },
    { status: 201 },
  )
})
