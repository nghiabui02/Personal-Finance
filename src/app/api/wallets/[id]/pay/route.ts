import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { from_wallet_id, amount, note, date } = await request.json()
  if (!amount || Number(amount) <= 0) return NextResponse.json({ error: 'Amount is required.' }, { status: 400 })
  if (!from_wallet_id) return NextResponse.json({ error: 'Source wallet is required.' }, { status: 400 })

  const [{ data: creditWallet }, { data: sourceWallet }] = await Promise.all([
    supabase.from('wallets').select('type, balance, credit_limit, name').eq('id', id).eq('user_id', user.id).single(),
    supabase.from('wallets').select('balance, name').eq('id', from_wallet_id).eq('user_id', user.id).single(),
  ])

  if (!creditWallet || creditWallet.type !== 'credit') return NextResponse.json({ error: 'Not a credit wallet.' }, { status: 400 })
  if (!sourceWallet) return NextResponse.json({ error: 'Source wallet not found.' }, { status: 404 })

  const creditLimit = Number(creditWallet.credit_limit ?? 0)
  const creditBalance = Number(creditWallet.balance)
  const amountOwed = creditLimit - creditBalance

  if (amountOwed <= 0) {
    return NextResponse.json({ error: 'No outstanding balance to pay.' }, { status: 400 })
  }

  const payAmount = Number(amount)

  if (payAmount > amountOwed) {
    return NextResponse.json({ error: `Payment exceeds outstanding balance of ${amountOwed}.` }, { status: 400 })
  }
  if (Number(sourceWallet.balance) < payAmount) {
    return NextResponse.json({ error: 'Insufficient balance in source wallet.' }, { status: 400 })
  }

  const newCreditBalance = creditBalance + payAmount
  const txDate = date ?? new Date().toISOString().slice(0, 10)
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

  if (updateCredit.error) return NextResponse.json({ error: updateCredit.error.message }, { status: 500 })
  if (updateSource.error) return NextResponse.json({ error: updateSource.error.message }, { status: 500 })
  if (insertTxns.error) return NextResponse.json({ error: insertTxns.error.message }, { status: 500 })

  return NextResponse.json({ ok: true, new_credit_balance: newCreditBalance })
}
