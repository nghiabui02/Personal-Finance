import { withAuth, badRequest, deleteOwnedRow, updateOwnedRow } from '@/lib/server/route'

export const PATCH = withAuth<{ id: string }>(async (request, { supabase, user, params }) => {
  const { id } = params

  const { amount, rollover, active } = await request.json()
  if (amount !== undefined && (!amount || Number(amount) <= 0)) return badRequest('amountIsRequired')

  return updateOwnedRow(supabase, 'budgets', { id, userId: user.id }, {
    amount: amount !== undefined ? Number(amount) : undefined,
    rollover: rollover !== undefined ? !!rollover : undefined,
    active: active !== undefined ? !!active : undefined,
  }, '*, categories(id, name, icon, color, default_key, name_is_custom, system_key)')
})

export const DELETE = withAuth<{ id: string }>(async (_request, { supabase, user, params }) => {
  const { id } = params

  return deleteOwnedRow(supabase, 'budgets', { id, userId: user.id })
})
