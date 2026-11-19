import { getTranslations } from 'next-intl/server'
import { NextResponse } from 'next/server'
import { badRequest, rpcError, withAuth } from '@/lib/server/route'
import { isUuid } from '@/lib/imports/bank-csv'
import { MAX_BULK_TRANSACTIONS } from '@/lib/constants'

/**
 * Acting on a selection of transactions at once — recategorising a stretch of
 * imported rows, or clearing out a batch entered twice.
 *
 * Transfers and debt repayments are excluded from both operations. Their
 * category and their direction are owned by the record they belong to, so
 * editing them from a list would desynchronise it silently.
 */

function readIds(body: unknown, t: Awaited<ReturnType<typeof getTranslations>>): string[] {
  const ids = (body as { ids?: unknown })?.ids
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error(t('selectAtLeastOneTransaction'))
  }
  if (ids.length > MAX_BULK_TRANSACTIONS) {
    throw new Error(t('selectionLimit', { limit: MAX_BULK_TRANSACTIONS }))
  }
  if (!ids.every(isUuid)) throw new Error(t('selectionContainsAnInvalidTransaction'))
  return [...new Set(ids as string[])]
}

export const PATCH = withAuth(async (request, { supabase }) => {
  const body = await request.json()

  let ids: string[]
  try { ids = readIds(body, await getTranslations('errors')) } catch (err) { return badRequest((err as Error).message) }

  const categoryId = (body as { user_category_id?: unknown }).user_category_id
  if (!isUuid(categoryId)) return badRequest('chooseACategory')

  const { data, error } = await supabase.rpc('recategorize_transactions', {
    p_ids: ids,
    p_user_category_id: categoryId,
  })
  if (error) return rpcError(error)
  return NextResponse.json({ updated: data })
})

export const DELETE = withAuth(async (request, { supabase }) => {
  const body = await request.json()

  let ids: string[]
  try { ids = readIds(body, await getTranslations('errors')) } catch (err) { return badRequest((err as Error).message) }

  // One database transaction for the whole batch: a row that cannot be
  // reversed takes the rest of the batch back with it.
  const { data, error } = await supabase.rpc('delete_transactions', { p_ids: ids })
  if (error) return rpcError(error)

  return NextResponse.json({ deleted: (data?.deleted_transaction_ids ?? []).length })
})
