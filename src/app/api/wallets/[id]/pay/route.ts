import { NextResponse } from 'next/server'
import { withAuth, rpcError } from '@/lib/server/route'
import { localYMD } from '@/lib/utils/date'

export const POST = withAuth<{ id: string }>(async (request, { supabase, params }) => {
  const { id } = params
  const { from_wallet_id, amount, note, date } = await request.json()

  // Card and source wallet are locked together; the two transaction rows and
  // both balances move as one unit.
  const { data, error } = await supabase.rpc('pay_credit_card', {
    p_card_wallet_id: id,
    p_from_wallet_id: from_wallet_id ?? null,
    p_amount: Number(amount),
    p_date: date || localYMD(),
    p_note: note ?? null,
  })

  if (error) return rpcError(error)

  return NextResponse.json({ ok: true, new_credit_balance: Number(data) })
})
