import { NextResponse } from 'next/server'
import { withAuth, badRequest, supabaseError } from '@/lib/server/route'

export const POST = withAuth(async (request, { supabase, user }) => {
  const body = await request.json()
  const { name, type, balance, icon, color, is_default, credit_limit, statement_day, payment_due_day } = body

  if (!name?.trim()) return badRequest('Name is required.')
  if (!['cash', 'bank', 'e_wallet', 'investment', 'other', 'credit'].includes(type)) {
    return badRequest('Invalid wallet type.')
  }

  if (is_default) {
    await supabase.from('wallets').update({ is_default: false }).eq('user_id', user.id)
  }

  const isCredit = type === 'credit'
  const creditLimit = isCredit ? Number(credit_limit) || 0 : null

  const { data, error } = await supabase
    .from('wallets')
    .insert({
      user_id: user.id,
      name: name.trim(),
      type,
      balance: isCredit ? creditLimit : (Number(balance) || 0),
      icon: icon?.trim() || null,
      color: color || null,
      is_default: is_default ?? false,
      credit_limit: creditLimit,
      statement_day: isCredit ? (Number(statement_day) || null) : null,
      payment_due_day: isCredit ? (Number(payment_due_day) || null) : null,
    })
    .select()
    .single()

  if (error) return supabaseError(error)
  return NextResponse.json(data, { status: 201 })
})
