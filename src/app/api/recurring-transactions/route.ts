import { NextResponse } from 'next/server'
import { withAuth, badRequest, supabaseError } from '@/lib/server/route'

export const GET = withAuth(async (_request, { supabase, user }) => {
  const { data, error } = await supabase
    .from('recurring_transactions')
    .select('*, categories(id, name, icon, color), wallets(id, name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return supabaseError(error)
  return NextResponse.json(data)
})

export const POST = withAuth(async (request, { supabase, user }) => {
  const body = await request.json()
  const { type, amount, category_id, wallet_id, note, frequency, start_date, end_date, bank_fee } = body

  if (!type || !amount || !frequency || !start_date) {
    return badRequest('Type, amount, frequency and start date are required.')
  }
  if (!['income', 'expense'].includes(type)) return badRequest('Invalid type.')
  if (!['daily', 'weekly', 'monthly', 'yearly'].includes(frequency)) {
    return badRequest('Invalid frequency.')
  }
  if (bank_fee !== undefined && bank_fee !== null && Number(bank_fee) < 0) {
    return badRequest('Bank fee must be positive.')
  }

  const { data, error } = await supabase
    .from('recurring_transactions')
    .insert({
      user_id: user.id,
      type,
      amount: Number(amount),
      category_id: category_id || null,
      wallet_id: wallet_id || null,
      note: note?.trim() || null,
      frequency,
      start_date,
      end_date: end_date || null,
      next_run_date: start_date,
      bank_fee: Number(bank_fee) > 0 ? Number(bank_fee) : null,
    })
    .select()
    .single()

  if (error) return supabaseError(error)
  return NextResponse.json(data, { status: 201 })
})
