import { NextResponse } from 'next/server'
import { withAuth, badRequest, notFound, noContent, supabaseError } from '@/lib/server/route'
import { localYMD } from '@/lib/utils/date'

export const PATCH = withAuth<{ id: string }>(async (request, { supabase, user, params }) => {
  const { id } = params

  const body = await request.json()
  const { name, type, balance, icon, color, is_default, credit_limit, statement_day, payment_due_day } = body

  if (!name?.trim()) return badRequest('Name is required.')

  if (is_default) {
    await supabase.from('wallets').update({ is_default: false }).eq('user_id', user.id).neq('id', id)
  }

  const isCredit = type === 'credit'

  let newBalance: number | undefined = isCredit ? undefined : (Number(balance) || 0)

  if (isCredit) {
    const { data: current } = await supabase
      .from('wallets')
      .select('balance, credit_limit')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (current) {
      const debtUsed = Number(current.credit_limit ?? 0) - Number(current.balance)
      newBalance = Math.max(0, Number(credit_limit) - debtUsed)
    }
  }

  const { data, error } = await supabase
    .from('wallets')
    .update({
      name: name.trim(),
      type,
      balance: newBalance,
      icon: icon?.trim() || null,
      color: color || null,
      is_default: is_default ?? false,
      credit_limit: isCredit ? (Number(credit_limit) || null) : null,
      statement_day: isCredit ? (Number(statement_day) || null) : null,
      payment_due_day: isCredit ? (Number(payment_due_day) || null) : null,
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
    .from('wallets').select('balance, is_default').eq('id', id).eq('user_id', user.id).single()

  if (!wallet) return notFound('Wallet not found.')

  const balance = Number(wallet.balance)

  // If it has remaining balance, transfer to the default wallet
  if (balance > 0) {
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
