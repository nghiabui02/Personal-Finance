import { NextResponse } from 'next/server'
import { withAuth, noContent, supabaseError } from '@/lib/server/route'

export const PATCH = withAuth<{ id: string }>(async (request, { supabase, user, params }) => {
  const { id } = params

  const body = await request.json()
  const { amount, category_id, wallet_id, note, frequency, end_date } = body

  const { data, error } = await supabase
    .from('recurring_transactions')
    .update({
      amount: amount ? Number(amount) : undefined,
      category_id: category_id !== undefined ? (category_id || null) : undefined,
      wallet_id: wallet_id !== undefined ? (wallet_id || null) : undefined,
      note: note !== undefined ? (note?.trim() || null) : undefined,
      frequency: frequency || undefined,
      end_date: end_date !== undefined ? (end_date || null) : undefined,
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

  const { error } = await supabase
    .from('recurring_transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return supabaseError(error)
  return noContent()
})
