import { NextResponse } from 'next/server'
import { withAuth, badRequest, supabaseError } from '@/lib/server/route'
import { localYM, monthRange } from '@/lib/utils/date'

export const GET = withAuth(async (request, { supabase, user }) => {
  const month = request.nextUrl.searchParams.get('month') ?? localYM()
  const { startDate, endDate } = monthRange(month)

  const { data, error } = await supabase
    .from('transactions')
    .select('*, categories(id, name, icon, color), wallets(id, name)')
    .eq('user_id', user.id)
    .gte('transaction_date', startDate)
    .lt('transaction_date', endDate)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return supabaseError(error)
  return NextResponse.json(data)
})

export const POST = withAuth(async (request, { supabase, user }) => {
  const body = await request.json()
  const { type, amount, category_id, wallet_id, transaction_date, note, bank_fee } = body

  if (!type || !amount || !transaction_date) {
    return badRequest('Type, amount and date are required.')
  }
  if (type !== 'income' && type !== 'expense') {
    return badRequest('Invalid type.')
  }
  if (bank_fee !== undefined && bank_fee !== null && Number(bank_fee) < 0) {
    return badRequest('Bank fee must be positive.')
  }

  // `amount` from the client is the base amount; the stored amount is the real
  // total charged to the wallet (base + fee) so no aggregate has to know about
  // bank_fee. bank_fee is kept alongside purely to show the breakdown.
  const fee = Number(bank_fee) > 0 ? Number(bank_fee) : null
  const total = Number(amount) + (fee ?? 0)

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      type,
      amount: total,
      bank_fee: fee,
      category_id: category_id || null,
      wallet_id: wallet_id || null,
      transaction_date,
      note: note?.trim() || null,
    })
    .select('*, categories(id, name, icon, color), wallets(id, name)')
    .single()

  if (error) return supabaseError(error)

  if (wallet_id) {
    const delta = type === 'income' ? total : -total
    const { error: balErr } = await supabase.rpc('adjust_wallet_balance', {
      p_wallet_id: wallet_id,
      p_delta: delta,
      p_user_id: user.id,
    })
    if (balErr) return supabaseError(balErr)
  }

  return NextResponse.json(data, { status: 201 })
})
