import CategoriesClient from './_components/categories-client'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const { type } = await searchParams
  const initialTab = type === 'income' ? 'income' : 'expense'

  const supabase = await createClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('is_default', { ascending: false })
    .order('name')

  return <CategoriesClient categories={categories ?? []} initialTab={initialTab} />
}
