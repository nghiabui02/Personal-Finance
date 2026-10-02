import { NextResponse } from 'next/server'
import { withAuth, rpcError } from '@/lib/server/route'
import { debtResult } from '@/lib/server/rpc-result'
import { ensureSystemCategory } from '@/lib/server/system-categories'
import { localYMD } from '@/lib/utils/date'

export const POST = withAuth(async (request, { supabase, user }) => {
  const body = await request.json()
  const { type, person_name, person_contact, amount, due_date, note, wallet_id, date } = body

  // Creating the category moves no money, so it stays out of the transaction
  // below. Which one it is follows from the direction of the debt.
  const categoryId = wallet_id && (type === 'lend' || type === 'borrow')
    ? await ensureSystemCategory(supabase, user.id, type === 'lend' ? 'lend_out' : 'borrow_in')
    : null

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
    p_category_id: categoryId,
  })

  if (error) return rpcError(error)

  return NextResponse.json(debtResult(data) ?? data, { status: 201 })
})
