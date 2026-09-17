import { NextResponse } from 'next/server'
import { withAuth, badRequest, supabaseError } from '@/lib/server/route'
import { ensureSystemCategory } from '@/lib/server/system-categories'
import { checkWalletCanCover } from '@/lib/server/wallet-balance'
import { localYMD } from '@/lib/utils/date'

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

  if (wallet_id && type === 'lend') {
    const check = await checkWalletCanCover(supabase, user.id, wallet_id, Number(amount))
    if (!check.ok) return badRequest(check.message!)
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
      supabase.rpc('adjust_wallet_balance', {
        p_wallet_id: wallet_id,
        p_delta: txType === 'income' ? Number(amount) : -Number(amount),
        p_user_id: user.id,
      }),
    ])
  }

  return NextResponse.json(data, { status: 201 })
})
