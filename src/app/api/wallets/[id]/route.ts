import { NextResponse } from 'next/server'
import { withAuth, badRequest, notFound, noContent, supabaseError } from '@/lib/server/route'
import { localYMD } from '@/lib/utils/date'

export const PATCH = withAuth<{ id: string }>(async (request, { supabase, user, params }) => {
  const { id } = params

  const { name, color } = await request.json()

  if (typeof name !== 'string' || !name.trim()) return badRequest('Name is required.')
  if (color !== undefined && color !== null && typeof color !== 'string') {
    return badRequest('Color must be a string.')
  }

  const { data, error } = await supabase
    .from('wallets')
    .update({
      name: name.trim(),
      ...(color !== undefined ? { color: color || null } : {}),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return supabaseError(error)
  return NextResponse.json(data)
})

export const DELETE = withAuth<{ id: string }>(async (_request, { supabase, user, params }) => {
  const { id } = params

  // Fetch the wallet being deleted
  const { data: wallet } = await supabase
    .from('wallets').select('balance, type').eq('id', id).eq('user_id', user.id).single()

  if (!wallet) return notFound('Wallet not found.')

  const balance = Number(wallet.balance)

  // Available credit is not cash and must never be transferred on deletion.
  if (wallet.type !== 'credit' && balance > 0) {
    const { data: defaultWallet } = await supabase
      .from('wallets').select('id, balance')
      .eq('user_id', user.id).eq('is_default', true).neq('id', id).single()

    if (!defaultWallet) {
      return badRequest('Cannot delete: wallet has balance but no default wallet found to receive it.')
    }

    // Move balance to default wallet and record a transfer transaction pair
    const pairId = crypto.randomUUID()
    const today = localYMD()
    await Promise.all([
      supabase.rpc('adjust_wallet_balance', { p_wallet_id: defaultWallet.id, p_delta: balance, p_user_id: user.id }),
      supabase.from('transactions').insert([
        {
          user_id: user.id, wallet_id: id, type: 'expense',
          amount: balance, note: 'Balance transferred to default wallet',
          transaction_date: today, transfer_pair_id: pairId,
        },
        {
          user_id: user.id, wallet_id: defaultWallet.id, type: 'income',
          amount: balance, note: 'Balance transferred from deleted wallet',
          transaction_date: today, transfer_pair_id: pairId,
        },
      ]),
    ])
  }

  const { error } = await supabase.from('wallets').delete().eq('id', id).eq('user_id', user.id)
  if (error) return supabaseError(error)
  return noContent()
})
