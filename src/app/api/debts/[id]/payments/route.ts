import { NextResponse } from 'next/server'
import { withAuth, rpcError, supabaseError } from '@/lib/server/route'
import { ensureSystemCategory } from '@/lib/server/system-categories'
import { localYMD } from '@/lib/utils/date'

export const POST = withAuth<{ id: string }>(async (request, { supabase, user, params }) => {
  const { id } = params
  const { amount, note, wallet_id, date } = await request.json()

  // Which direction this lands in depends on the debt, so the category has to
  // be resolved before the money moves. Creating it changes no balance, so it
  // is safe to leave outside the transaction below.
  const { data: debt } = await supabase
    .from('debts')
    .select('type')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  const categoryId = debt
    ? await ensureSystemCategory(supabase, user.id, debt.type === 'lend' ? 'collect_debt' : 'repay_debt')
    : null

  // The wallet is checked before the payment record and the debt change, so a
  // wallet that cannot cover the payment leaves the debt exactly as it was.
  const { data, error } = await supabase.rpc('record_debt_payment', {
    p_debt_id: id,
    p_amount: Number(amount),
    p_date: date || localYMD(),
    p_wallet_id: wallet_id || null,
    p_category_id: categoryId,
    p_note: note ?? null,
  })

  if (error) return rpcError(error)
  if (!data) return supabaseError({ message: 'Payment did not return a result.' })

  return NextResponse.json(data, { status: 201 })
})
