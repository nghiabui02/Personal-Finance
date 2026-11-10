import { NextResponse } from 'next/server'
import { withAuth, noContent, rpcError } from '@/lib/server/route'
import { transactionWithRelations } from '@/lib/server/rpc-result'
import { transactionRpcParams } from '@/lib/server/rpc-params'

export const PATCH = withAuth<{ id: string }>(async (request, { supabase, params }) => {
  const { id } = params

  const body = await request.json()

  // Reversing the old balance, applying the new one and re-syncing a linked
  // debt all happen inside the function: a failure part-way through rolls the
  // whole edit back instead of leaving the wallet moved and the row unchanged.
  const { data, error } = await supabase.rpc('update_transaction', { p_id: id, ...transactionRpcParams(body) })

  if (error) return rpcError(error)

  return NextResponse.json(await transactionWithRelations(supabase, data))
})

export const DELETE = withAuth<{ id: string }>(async (_request, { supabase, params }) => {
  const { id } = params

  // Reverses the wallet and, for a debt repayment, puts the amount back on the
  // debt and drops the payment record — all or nothing.
  const { error } = await supabase.rpc('delete_transaction', { p_id: id })
  if (error) return rpcError(error)

  return noContent()
})
