import { NextResponse } from 'next/server'
import { badRequest, notFound, rpcError, supabaseError, withAuth } from '@/lib/server/route'
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

function readIds(body: unknown): string[] {
  const ids = (body as { ids?: unknown })?.ids
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('Select at least one transaction.')
  }
  if (ids.length > MAX_BULK_TRANSACTIONS) {
    throw new Error(`Select at most ${MAX_BULK_TRANSACTIONS} transactions at a time.`)
  }
  if (!ids.every(isUuid)) throw new Error('Selection contains an invalid transaction.')
  return [...new Set(ids as string[])]
}

export const PATCH = withAuth(async (request, { supabase, user }) => {
  const body = await request.json()

  let ids: string[]
  try { ids = readIds(body) } catch (err) { return badRequest((err as Error).message) }

  const categoryId = (body as { category_id?: unknown }).category_id
  if (!isUuid(categoryId)) return badRequest('Choose a category.')

  // Row-level security decides visibility, so a category that comes back is one
  // this user may file against — own or shared starter.
  const { data: category, error: categoryError } = await supabase
    .from('categories').select('id, type').eq('id', categoryId).maybeSingle()
  if (categoryError) return supabaseError(categoryError)
  if (!category) return notFound('That category no longer exists.')

  const { data, error } = await supabase
    .from('transactions')
    .update({ category_id: category.id })
    .eq('user_id', user.id)
    .in('id', ids)
    .eq('type', category.type)
    .is('transfer_pair_id', null)
    .is('debt_payment_id', null)
    .select('id')

  if (error) return supabaseError(error)

  // Fewer rows than asked for means the selection held something this category
  // cannot describe. Reporting it beats leaving a silent partial edit.
  if ((data?.length ?? 0) !== ids.length) {
    return badRequest(
      `Only ${data?.length ?? 0} of ${ids.length} could take that category. ` +
      'Income and expense rows need their own, and transfers and debt repayments cannot be recategorised.',
    )
  }

  return NextResponse.json({ updated: data!.length })
})

export const DELETE = withAuth(async (request, { supabase }) => {
  const body = await request.json()

  let ids: string[]
  try { ids = readIds(body) } catch (err) { return badRequest((err as Error).message) }

  // One database transaction for the whole batch: a row that cannot be
  // reversed takes the rest of the batch back with it.
  const { data, error } = await supabase.rpc('delete_transactions', { p_ids: ids })
  if (error) return rpcError(error)

  return NextResponse.json({ deleted: (data?.deleted_transaction_ids ?? []).length })
})
