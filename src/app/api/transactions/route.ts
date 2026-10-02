import { NextResponse } from 'next/server'
import { withAuth, rpcError } from '@/lib/server/route'

export const POST = withAuth(async (request, { supabase }) => {
  const body = await request.json()
  const { type, amount, category_id, wallet_id, transaction_date, note, bank_fee } = body

  // `amount` is the base; the function adds the fee and moves the wallet by the
  // total, inside one database transaction so a row can never exist without its
  // balance change (or the other way round).
  const { data, error } = await supabase.rpc('create_transaction', {
    p_type: type,
    p_amount: Number(amount),
    p_transaction_date: transaction_date,
    p_category_id: category_id || null,
    p_wallet_id: wallet_id || null,
    p_note: note ?? null,
    p_bank_fee: bank_fee ?? null,
  })

  if (error) return rpcError(error)

  // The function returns the bare row; the client wants its category and wallet
  // alongside, same as before.
  const { data: full } = await supabase
    .from('transactions')
    .select('*, categories(id, name, icon, color), wallets(id, name)')
    .eq('id', data.id)
    .single()

  return NextResponse.json(full ?? data, { status: 201 })
})
