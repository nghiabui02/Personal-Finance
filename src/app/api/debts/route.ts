import { NextResponse } from 'next/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { withAuth, badRequest, supabaseError } from '@/lib/server/route'
import { ensureSystemCategory } from '@/lib/server/system-categories'
import { localYMD } from '@/lib/utils/date'

async function adjustBalance(
  supabase: SupabaseClient,
  walletId: string,
  delta: number,
  userId: string,
) {
  const { data: wallet } = await supabase
    .from('wallets')
    .select('balance')
    .eq('id', walletId)
    .eq('user_id', userId)
    .single()

  if (!wallet) return

  await supabase
    .from('wallets')
    .update({ balance: Number(wallet.balance) + delta })
    .eq('id', walletId)
    .eq('user_id', userId)
}

export const POST = withAuth(async (request, { supabase, user }) => {
  const body = await request.json()
  const { type, person_name, person_contact, amount, due_date, note, wallet_id, date } = body
  const transactionDate = date || localYMD()

  if (!type || !person_name?.trim() || !amount) {
    return badRequest('Type, name and amount are required.')
  }
  if (type !== 'lend' && type !== 'borrow') {
    return badRequest('Invalid type.')
  }

  const { data, error } = await supabase
    .from('debts')
    .insert({
      user_id: user.id,
      type,
      wallet_id: wallet_id || null,
      person_name: person_name.trim(),
      person_contact: person_contact?.trim() || null,
      amount: Number(amount),
      remaining_amount: Number(amount),
      due_date: due_date || null,
      note: note?.trim() || null,
      status: 'active',
    })
    .select()
    .single()

  if (error) return supabaseError(error)

  if (wallet_id) {
    const txType = type === 'lend' ? 'expense' : 'income'
    const txNote = type === 'lend' ? `Lent to ${person_name.trim()}` : `Borrowed from ${person_name.trim()}`
    const categoryId = await ensureSystemCategory(supabase, user.id, type === 'lend' ? 'lend_out' : 'borrow_in')

    await Promise.all([
      supabase.from('transactions').insert({
        user_id: user.id,
        type: txType,
        amount: Number(amount),
        wallet_id,
        transaction_date: transactionDate,
        note: txNote,
        category_id: categoryId,
      }),
      adjustBalance(supabase, wallet_id, txType === 'income' ? Number(amount) : -Number(amount), user.id),
    ])
  }

  return NextResponse.json(data, { status: 201 })
})
