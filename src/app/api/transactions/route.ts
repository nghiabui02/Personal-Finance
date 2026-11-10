import { NextResponse } from 'next/server'
import { withAuth, rpcError } from '@/lib/server/route'
import { transactionWithRelations } from '@/lib/server/rpc-result'
import { transactionRpcParams } from '@/lib/server/rpc-params'

export const POST = withAuth(async (request, { supabase }) => {
  const body = await request.json()

  // `amount` is the base; the function adds the fee and moves the wallet by the
  // total, inside one database transaction so a row can never exist without its
  // balance change (or the other way round).
  const { data, error } = await supabase.rpc('create_transaction', transactionRpcParams(body))

  if (error) return rpcError(error)

  return NextResponse.json(await transactionWithRelations(supabase, data), { status: 201 })
})
