import { NextResponse } from 'next/server'
import { withAuth, noContent, supabaseError } from '@/lib/server/route'

export const PATCH = withAuth<{ id: string }>(async (request, { supabase, user, params }) => {
  const { id } = params

  const body = await request.json()
  const { person_name, person_contact, due_date, note, status } = body

  const { data, error } = await supabase
    .from('debts')
    .update({
      person_name: person_name?.trim(),
      person_contact: person_contact?.trim() || null,
      due_date: due_date || null,
      note: note?.trim() || null,
      ...(status ? { status } : {}),
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
    .from('debts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return supabaseError(error)
  return noContent()
})
