import { NextResponse } from 'next/server'
import { withAuth, badRequest, noContent, rpcError, supabaseError } from '@/lib/server/route'
import { localYMD } from '@/lib/utils/date'

export const PATCH = withAuth<{ id: string }>(async (request, { supabase, user, params }) => {
  const { id } = params

  const { name, color } = await request.json()

  if (typeof name !== 'string' || !name.trim()) return badRequest('Name is required.')
  if (color !== undefined && color !== null && typeof color !== 'string') {
    return badRequest('Color must be a string.')
  }

  const { data, error } = await supabase
    .from('wallets')
    .update({
      name: name.trim(),
      ...(color !== undefined ? { color: color || null } : {}),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return supabaseError(error)

  return NextResponse.json(data)
})

export const DELETE = withAuth<{ id: string }>(async (_request, { supabase, params }) => {
  const { id } = params

  // Refuses a card that still owes, hands any remaining cash to the default
  // wallet as a recorded transfer, and deletes — all in one transaction, so a
  // failure cannot leave the money moved and the wallet still there.
  const { error } = await supabase.rpc('delete_wallet', {
    p_wallet_id: id,
    p_date: localYMD(),
  })
  if (error) return rpcError(error)

  return noContent()
})
