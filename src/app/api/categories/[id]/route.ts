import { withAuth, badRequest, notFound, deleteOwnedRow, updateOwnedRow } from '@/lib/server/route'

export const PATCH = withAuth<{ id: string }>(async (request, { supabase, user, params }) => {
  const { id } = params

  const body = await request.json()
  const { name, icon, color } = body

  if (name !== undefined && (typeof name !== 'string' || !name.trim())) return badRequest('nameIsRequired')

  return updateOwnedRow(supabase, 'categories', { id, userId: user.id }, {
    ...(name !== undefined ? { name: name.trim(), name_is_custom: true } : {}),
    ...(icon !== undefined ? { icon: typeof icon === 'string' ? icon.trim() || null : null } : {}),
    ...(color !== undefined ? { color: color || null } : {}),
  })
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

  if (!category) return notFound('categoryNotFound')
  if (!category.user_id) {
    return badRequest('thisIsOneOfTheBuiltInStarterCategoriesAndCannotBe')
  }
  if (category.system_key) {
    return badRequest('thisCategoryKeepsYourDebtAndBalanceAdjustmentTotalsCorrectItCannot')
  }

  return deleteOwnedRow(supabase, 'categories', { id, userId: user.id })
})
