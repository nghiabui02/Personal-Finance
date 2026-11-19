import { NextResponse } from 'next/server'
import { withAuth, rpcError } from '@/lib/server/route'
import { debtResult } from '@/lib/server/rpc-result'
import { localYMD } from '@/lib/utils/date'

export const POST = withAuth(async (request, { supabase }) => {
  const body = await request.json()
  const { type, person_name, person_contact, amount, due_date, note, wallet_id, date } = body

  // Debt row, transaction and balance move as one: a wallet that cannot cover
  // the loan now leaves no debt behind.
  const { data, error } = await supabase.rpc('create_debt', {
    p_type: type,
    p_person_name: person_name ?? '',
    p_amount: Number(amount),
    p_date: date || localYMD(),
    p_person_contact: person_contact ?? null,
    p_due_date: due_date || null,
    p_note: note ?? null,
    p_wallet_id: wallet_id || null,
  })

  if (error) return rpcError(error)

  return NextResponse.json(debtResult(data) ?? data, { status: 201 })
})
