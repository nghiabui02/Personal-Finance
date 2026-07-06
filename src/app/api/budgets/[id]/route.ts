import { NextResponse } from 'next/server'
import { withAuth, badRequest, noContent, supabaseError } from '@/lib/server/route'

export const PATCH = withAuth<{ id: string }>(async (request, { supabase, user, params }) => {
  const { id } = params

  const { amount } = await request.json()
  if (!amount || Number(amount) <= 0) return badRequest('Amount is required.')

  const { data, error } = await supabase
    .from('budgets')
    .update({ amount: Number(amount) })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*, categories(id, name, icon, color)')
    .single()

  if (error) return supabaseError(error)
  return NextResponse.json(data)
})

export const DELETE = withAuth<{ id: string }>(async (_request, { supabase, user, params }) => {
  const { id } = params

  const { error } = await supabase
    .from('budgets')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return supabaseError(error)
  return noContent()
})
