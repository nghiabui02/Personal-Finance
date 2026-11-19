import { NextResponse } from 'next/server'
import { CATEGORY_COLUMNS } from '@/lib/category-columns'
import { withAuth, badRequest, rpcError } from '@/lib/server/route'

export const POST = withAuth(async (request, { supabase, user }) => {
  const { name, icon, color, type } = await request.json()
  if (typeof name !== 'string' || !name.trim()) return badRequest('nameIsRequired')
  if (type !== 'income' && type !== 'expense') return badRequest('invalidType')
  if (icon !== undefined && typeof icon !== 'string') return badRequest('invalidCategoryAppearance')
  if (color !== undefined && (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color))) return badRequest('invalidCategoryAppearance')

  const { data, error } = await supabase.from('user_categories')
    .insert({ user_id: user.id, name: name.trim(), icon: icon?.trim() || null, color: color || null, type })
    .select(CATEGORY_COLUMNS).single()
  if (error) return rpcError(error)
  return NextResponse.json(data, { status: 201 })
})
