import { NextResponse } from 'next/server'
import { isUuid } from '@/lib/imports/bank-csv'
import { badRequest, rpcError, withAuth } from '@/lib/server/route'

/** Adoption and reactivation share one atomic, idempotent database operation. */
export const POST = withAuth(async (request, { supabase }) => {
  const { template_ids: ids } = await request.json()
  if (!Array.isArray(ids) || !ids.length || !ids.every(isUuid)) return badRequest('chooseACategory')
  const { data, error } = await supabase.rpc('adopt_categories', { p_template_ids: [...new Set(ids)] })
  if (error) return rpcError(error)
  return NextResponse.json(data, { status: 201 })
})
