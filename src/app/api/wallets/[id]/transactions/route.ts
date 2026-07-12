import { NextResponse } from 'next/server'
import { withAuth, badRequest, supabaseError } from '@/lib/server/route'
import { WALLET_TX_PAGE_SIZE } from '@/lib/api/wallets'

// Paginated transaction history for a wallet — powers lazy-loading on the detail screen.
export const GET = withAuth<{ id: string }>(async (request, { supabase, user, params }) => {
  const { id } = params
  const offset = Number(request.nextUrl.searchParams.get('offset') ?? 0)
  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') ?? WALLET_TX_PAGE_SIZE), 100)

  if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit <= 0) {
    return badRequest('Invalid offset or limit.')
  }

  const { data, error } = await supabase
    .from('transactions')
    .select('id, type, amount, note, transaction_date, category_id, transfer_pair_id, categories(id, name, icon, color)')
    .eq('wallet_id', id)
    .eq('user_id', user.id)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return supabaseError(error)
  return NextResponse.json({ transactions: data, hasMore: data.length === limit })
})
