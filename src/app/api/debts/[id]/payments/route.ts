import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { amount, note } = await request.json()
  if (!amount || Number(amount) <= 0) {
    return NextResponse.json({ error: 'Amount is required.' }, { status: 400 })
  }

  // Get current debt
  const { data: debt } = await supabase
    .from('debts')
    .select('remaining_amount')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!debt) return NextResponse.json({ error: 'Debt not found.' }, { status: 404 })

  const newRemaining = Math.max(0, Number(debt.remaining_amount) - Number(amount))
  const isSettled = newRemaining === 0

  // Insert payment + update remaining_amount (+ mark completed if settled)
  const [{ error: payErr }, { error: debtErr }] = await Promise.all([
    supabase.from('debt_payments').insert({
      debt_id: id,
      amount: Number(amount),
      note: note?.trim() || null,
    }),
    supabase.from('debts').update({
      remaining_amount: newRemaining,
      ...(isSettled ? { status: 'completed' } : {}),
    }).eq('id', id).eq('user_id', user.id),
  ])

  if (payErr || debtErr) {
    return NextResponse.json({ error: payErr?.message ?? debtErr?.message }, { status: 500 })
  }

  return NextResponse.json({ remaining_amount: newRemaining, settled: isSettled }, { status: 201 })
}
