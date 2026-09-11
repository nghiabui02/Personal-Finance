import type { Metadata } from 'next'
import CategoriesClient from './_components/categories-client'
import { requireUser } from '@/lib/server/auth'

export const metadata: Metadata = { title: 'Categories' }

export const dynamic = 'force-dynamic'

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const { type } = await searchParams
  const initialTab = type === 'income' ? 'income' : 'expense'

  const { supabase, user } = await requireUser()

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .or(`user_id.eq.${user.id},is_default.eq.true`)
    .order('is_default', { ascending: false })
    .order('name')

  return <CategoriesClient categories={categories ?? []} initialTab={initialTab} />
}
