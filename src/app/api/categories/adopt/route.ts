import { NextResponse } from 'next/server'
import { isUuid } from '@/lib/imports/bank-csv'
import { badRequest, rpcError, withAuth } from '@/lib/server/route'

/**
 * Adding a Store template to the user's categories. The database derives every
 * field of the copy from the template, so the body carries only its id, and
 * adding the same template twice answers with the category the first call made.
 */
export const POST = withAuth(async (request, { supabase }) => {
  const { template_id: templateId } = await request.json()
  if (!isUuid(templateId)) return badRequest('chooseACategory')

  const { data, error } = await supabase.rpc('adopt_category', { p_template_id: templateId })
  if (error) return rpcError(error)

  return NextResponse.json(data, { status: 201 })
})
