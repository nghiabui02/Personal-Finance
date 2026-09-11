import { NextResponse } from 'next/server'
import { withAuth, badRequest, supabaseError } from '@/lib/server/route'

export const POST = withAuth(async (request, { supabase, user }) => {
  const body = await request.json()
  const { name, icon, color, type } = body

  if (!name?.trim()) return badRequest('Name is required.')
  if (type !== 'income' && type !== 'expense') return badRequest('Invalid type.')

  const { data, error } = await supabase
    .from('categories')
    .insert({ user_id: user.id, name: name.trim(), icon: icon?.trim() || null, color: color || null, type })
    .select()
    .single()

  if (error) return supabaseError(error)

  return NextResponse.json(data, { status: 201 })
})
