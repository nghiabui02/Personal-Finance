import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import CategoriesClient from './_components/categories-client'
import { requireUser } from '@/lib/server/auth'
import { getCategories } from '@/lib/server/queries'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('navigation')
  return { title: t('categories') }
}

export const dynamic = 'force-dynamic'

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const { type } = await searchParams
  const initialTab = type === 'income' ? 'income' : 'expense'

  const { supabase } = await requireUser()

  const categories = await getCategories(supabase)

  return <CategoriesClient categories={categories} initialTab={initialTab} />
}
