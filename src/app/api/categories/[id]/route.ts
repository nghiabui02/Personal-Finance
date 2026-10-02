import { NextResponse } from 'next/server'
import { withAuth, badRequest, notFound, noContent, supabaseError } from '@/lib/server/route'

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

  // Two kinds of category are not the user's to delete, and the old code let
  // both through: the delete matched no row and still answered 204, so the
  // list showed it gone until the next refresh brought it back.
  //   - shared starter categories (user_id is null)
  //   - system categories, which reports read by `system_key` to keep debt and
  //     adjustment rows out of income and spending
  const { data: category } = await supabase
    .from('categories')
    .select('system_key, user_id')
    .eq('id', id)
    .or(`user_id.eq.${user.id},user_id.is.null`)
    .maybeSingle()

  if (!category) return notFound('Category not found.')
  if (!category.user_id) {
    return badRequest('This is one of the built-in starter categories and cannot be deleted.')
  }
  if (category.system_key) {
    return badRequest('This category keeps your debt and balance-adjustment totals correct. It cannot be deleted.')
  }

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return supabaseError(error)

  return noContent()
})
