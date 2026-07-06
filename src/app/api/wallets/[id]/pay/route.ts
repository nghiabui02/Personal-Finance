import { NextResponse } from 'next/server'
import { withAuth, badRequest, notFound, supabaseError } from '@/lib/server/route'
import { localYMD } from '@/lib/utils/date'

export const POST = withAuth<{ id: string }>(async (request, { supabase, user, params }) => {
  const { id } = params

  const { from_wallet_id, amount, note, date } = await request.json()
  if (!amount || Number(amount) <= 0) return badRequest('Amount is required.')
  if (!from_wallet_id) return badRequest('Source wallet is required.')

  const [{ data: creditWallet }, { data: sourceWallet }] = await Promise.all([
    supabase.from('wallets').select('type, balance, credit_limit, name').eq('id', id).eq('user_id', user.id).single(),
    supabase.from('wallets').select('balance, name').eq('id', from_wallet_id).eq('user_id', user.id).single(),
  ])

  if (!creditWallet || creditWallet.type !== 'credit') return badRequest('Not a credit wallet.')
  if (!sourceWallet) return notFound('Source wallet not found.')

  const creditLimit = Number(creditWallet.credit_limit ?? 0)
  const creditBalance = Number(creditWallet.balance)
  const amountOwed = creditLimit - creditBalance

  if (amountOwed <= 0) {
    return badRequest('No outstanding balance to pay.')
  }

  const payAmount = Number(amount)

  if (payAmount > amountOwed) {
    return badRequest(`Payment exceeds outstanding balance of ${amountOwed}.`)
  }
  if (Number(sourceWallet.balance) < payAmount) {
    return badRequest('Insufficient balance in source wallet.')
  }

  const newCreditBalance = creditBalance + payAmount
  const txDate = date ?? localYMD()
  const txNote = note?.trim() || `Credit card payment — ${creditWallet.name}`
  const pairId = crypto.randomUUID()

  const [updateCredit, updateSource, insertTxns] = await Promise.all([
    supabase.rpc('adjust_wallet_balance', { p_wallet_id: id, p_delta: payAmount, p_user_id: user.id }),
    supabase.rpc('adjust_wallet_balance', { p_wallet_id: from_wallet_id, p_delta: -payAmount, p_user_id: user.id }),
    supabase.from('transactions').insert([
      { user_id: user.id, wallet_id: from_wallet_id, type: 'expense', amount: payAmount, note: txNote, transaction_date: txDate, transfer_pair_id: pairId },
      { user_id: user.id, wallet_id: id, type: 'income', amount: payAmount, note: txNote, transaction_date: txDate, transfer_pair_id: pairId },
    ]),
  ])

  if (updateCredit.error) return supabaseError(updateCredit.error)
  if (updateSource.error) return supabaseError(updateSource.error)
  if (insertTxns.error) return supabaseError(insertTxns.error)

  return NextResponse.json({ ok: true, new_credit_balance: newCreditBalance })
})
