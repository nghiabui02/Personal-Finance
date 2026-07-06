import { NextResponse } from 'next/server'
import { withAuth, badRequest, supabaseError } from '@/lib/server/route'

export const GET = withAuth(async (_request, { supabase, user }) => {
  const { data, error } = await supabase
    .from('saving_goals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return supabaseError(error)
  return NextResponse.json(data)
})

export const POST = withAuth(async (request, { supabase, user }) => {
  const body = await request.json()
  const { name, icon, target_amount, deadline, note } = body

  if (!name?.trim() || !target_amount) {
    return badRequest('Name and target amount are required.')
  }

  const { data, error } = await supabase
    .from('saving_goals')
    .insert({
      user_id: user.id,
      name: name.trim(),
      icon: icon?.trim() || null,
      target_amount: Number(target_amount),
      current_amount: 0,
      deadline: deadline || null,
      status: 'active',
      note: note?.trim() || null,
    })
    .select()
    .single()

  if (error) return supabaseError(error)
  return NextResponse.json(data, { status: 201 })
})
