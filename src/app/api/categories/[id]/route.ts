import { NextResponse } from 'next/server'
import { withAuth, badRequest, noContent, supabaseError } from '@/lib/server/route'

export const PATCH = withAuth<{ id: string }>(async (request, { supabase, user, params }) => {
  const { id } = params

  const body = await request.json()
  const { name, icon, color } = body

  if (!name?.trim()) return badRequest('Name is required.')

  const { data, error } = await supabase
    .from('categories')
    .update({ name: name.trim(), icon: icon?.trim() || null, color: color || null })
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
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return supabaseError(error)

  return noContent()
})
