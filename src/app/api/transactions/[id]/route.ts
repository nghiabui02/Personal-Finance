import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { type, amount, category_id, wallet_id, transaction_date, note } = body

  if (!type || !amount || !transaction_date) {
    return NextResponse.json({ error: 'Type, amount and date are required.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('transactions')
    .update({
      type,
      amount: Number(amount),
      category_id: category_id || null,
      wallet_id: wallet_id || null,
      transaction_date,
      note: note?.trim() || null,
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*, categories(id, name, icon, color), wallets(id, name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
