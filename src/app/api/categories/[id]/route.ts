import { NextResponse } from 'next/server'
import { CATEGORY_COLUMNS } from '@/lib/category-columns'
import { isUuid } from '@/lib/imports/bank-csv'
import { withAuth, badRequest, notFound, rpcError } from '@/lib/server/route'

/** Removal is reversible. Physical DELETE is deliberately unsupported. */
export const PATCH = withAuth<{ id: string }>(async (request, { supabase, user, params }) => {
  if (!isUuid(params.id)) return badRequest('chooseACategory')
  const { name, icon, color, is_active } = await request.json()
  if (name !== undefined && (typeof name !== 'string' || !name.trim())) return badRequest('nameIsRequired')
  if (icon !== undefined && typeof icon !== 'string') return badRequest('invalidCategoryAppearance')
  if (color !== undefined && (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color))) return badRequest('invalidCategoryAppearance')
  if (is_active !== undefined && typeof is_active !== 'boolean') return badRequest('invalidCategoryState')

  const { data, error } = await supabase.from('user_categories').update({
    ...(name !== undefined ? { name: name.trim() } : {}),
    ...(icon !== undefined ? { icon: icon.trim() || null } : {}),
    ...(color !== undefined ? { color } : {}),
    ...(is_active !== undefined ? { is_active } : {}),
  }).eq('id', params.id).eq('user_id', user.id).select(CATEGORY_COLUMNS).maybeSingle()
  if (error) return rpcError(error)
  if (!data) return notFound('categoryNotFound')
  return NextResponse.json(data)
})
