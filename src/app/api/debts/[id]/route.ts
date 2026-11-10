import { withAuth, deleteOwnedRow, updateOwnedRow } from '@/lib/server/route'

export const PATCH = withAuth<{ id: string }>(async (request, { supabase, user, params }) => {
  const { id } = params

  const body = await request.json()
  const { person_name, person_contact, due_date, note, status } = body

  return updateOwnedRow(supabase, 'debts', { id, userId: user.id }, {
    person_name: person_name?.trim(),
    person_contact: person_contact?.trim() || null,
    due_date: due_date || null,
    note: note?.trim() || null,
    ...(status ? { status } : {}),
  })
})

export const DELETE = withAuth<{ id: string }>(async (_request, { supabase, user, params }) => {
  const { id } = params

  return deleteOwnedRow(supabase, 'debts', { id, userId: user.id })
})
