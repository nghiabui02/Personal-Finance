import { NextResponse } from 'next/server'
import { withAuth, badRequest, notFound, rpcError } from '@/lib/server/route'
import { ensureSystemCategory } from '@/lib/server/system-categories'
import { localYMD } from '@/lib/utils/date'

/**
 * Bring a wallet in line with the real balance read off the bank.
 *
 * The recorded balance is derived from transactions, so fees, interest and
 * forgotten spends make it drift. Rather than overwrite the number — which
 * would leave the history adding up to something else — this files one
 * adjustment transaction for the difference. The drift stays visible and every
 * report keeps balancing.
 */

/**
 * Confirms a caller-supplied category is the user's own and points the right
 * way: crediting a wallet cannot be filed under an expense category.
 */
async function resolveUserCategory(
  supabase: Parameters<typeof ensureSystemCategory>[0],
  userId: string,
  categoryId: string,
  direction: 'income' | 'expense',
): Promise<string | null> {
  const { data } = await supabase
    .from('categories')
    .select('id, type')
    .eq('id', categoryId)
    .eq('type', direction)
    .or(`user_id.eq.${userId},user_id.is.null`)
    .maybeSingle()

  return data?.id ?? null
}

export const POST = withAuth<{ id: string }>(async (request, { supabase, user, params }) => {
  const { id } = params
  const { actual_balance, note, date, category_id } = await request.json()

  const actual = Number(actual_balance)
  if (!Number.isFinite(actual)) return badRequest('Enter the balance shown by your bank.')

  // Read once to work out which way the gap goes, so only the category that is
  // actually needed gets created. The function re-reads the balance under a
  // lock and refuses if the direction flipped in between.
  const { data: wallet } = await supabase
    .from('wallets')
    .select('balance')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!wallet) return notFound('Wallet not found.')

  const expectedUp = actual - Number(wallet.balance) > 0
  const direction = expectedUp ? 'income' : 'expense'

  // A gap is not always a bookkeeping error. A savings pocket that pays daily
  // interest grows on its own, and that growth is real income — filing it as a
  // correction would keep it out of the month's totals, where it belongs.
  // Default stays "correction"; the caller names a category to say otherwise.
  const categoryId = category_id
    ? await resolveUserCategory(supabase, user.id, category_id, direction)
    : await ensureSystemCategory(supabase, user.id, expectedUp ? 'adjust_up' : 'adjust_down')

  if (!categoryId) return badRequest('That category does not match the direction of this change.')

  const { data, error } = await supabase.rpc('reconcile_wallet', {
    p_wallet_id: id,
    p_actual_balance: actual,
    p_date: date || localYMD(),
    p_category_up: expectedUp ? categoryId : null,
    p_category_down: expectedUp ? null : categoryId,
    p_note: note ?? null,
  })

  if (error) return rpcError(error)

  return NextResponse.json(data)
})
