import { withAuth, deleteOwnedRow, updateOwnedRow } from '@/lib/server/route'

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

  return updateOwnedRow(supabase, 'saving_goals', { id, userId: user.id }, update)
})

export const DELETE = withAuth<{ id: string }>(async (_request, { supabase, user, params }) => {
  const { id } = params

  return deleteOwnedRow(supabase, 'saving_goals', { id, userId: user.id })
})
