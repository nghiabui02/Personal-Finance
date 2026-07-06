import { NextResponse } from 'next/server'
import { withAuth, noContent, supabaseError } from '@/lib/server/route'

export const PATCH = withAuth<{ id: string }>(async (request, { supabase, user, params }) => {
  const { id } = params

  const body = await request.json()
  const { name, icon, target_amount, current_amount, deadline, note, status } = body

  const update: Record<string, unknown> = {}
  if (name !== undefined) update.name = name?.trim()
  if (icon !== undefined) update.icon = icon?.trim() || null
  if (target_amount !== undefined) update.target_amount = Number(target_amount)
  if (current_amount !== undefined) update.current_amount = Number(current_amount)
  if (deadline !== undefined) update.deadline = deadline || null
  if (note !== undefined) update.note = note?.trim() || null
  if (status !== undefined) update.status = status

  const { data, error } = await supabase
    .from('saving_goals')
    .update(update)
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
    .from('saving_goals')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return supabaseError(error)
  return noContent()
})
