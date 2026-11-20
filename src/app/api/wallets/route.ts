import { NextResponse } from 'next/server'
import { withAuth, badRequest, rpcError } from '@/lib/server/route'

export const POST = withAuth(async (request, { supabase }) => {
  const body = await request.json()
  const { name, type, balance, icon, color, is_default, credit_limit, statement_day, payment_due_day } = body

  if (!name?.trim()) return badRequest('nameIsRequired')
  if (!['cash', 'bank', 'e_wallet', 'investment', 'other', 'credit'].includes(type)) {
    return badRequest('invalidWalletType')
  }

  const isCredit = type === 'credit'
  const creditLimit = isCredit ? Number(credit_limit) || 0 : null

  const { data, error } = await supabase.rpc('create_wallet', {
    p_name: name.trim(),
    p_type: type,
    p_balance: isCredit ? creditLimit : (Number(balance) || 0),
    p_icon: icon?.trim() || null,
    p_color: color || null,
    p_is_default: is_default ?? false,
    p_credit_limit: creditLimit,
    p_statement_day: isCredit ? (Number(statement_day) || null) : null,
    p_payment_due_day: isCredit ? (Number(payment_due_day) || null) : null,
  })

  if (error) return rpcError(error)
  return NextResponse.json(data, { status: 201 })
})
