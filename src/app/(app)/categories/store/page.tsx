import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { requireUser } from '@/lib/server/auth'
import type { CategoryTemplate } from '@/lib/api/categories'
import { TEMPLATE_COLUMNS } from '@/lib/category-columns'
import { getCategories } from '@/lib/server/queries'
import StoreClient from './_components/store-client'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('categories')
  return { title: t('store') }
}

export const dynamic = 'force-dynamic'

export default async function CategoryStorePage() {
  const { supabase } = await requireUser()
  const [templates, memberships] = await Promise.all([
    supabase.from('categories').select(TEMPLATE_COLUMNS).eq('is_available', true),
    getCategories(supabase),
  ])
  if (templates.error) throw templates.error
  return <StoreClient templates={templates.data as CategoryTemplate[]} memberships={memberships} />
}
