import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { requireUser } from '@/lib/server/auth'
import { CATEGORY_COLUMNS, type Category } from '@/lib/api/categories'
import StoreClient from './_components/store-client'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('categories')
  return { title: t('store') }
}

export const dynamic = 'force-dynamic'

export default async function CategoryStorePage() {
  const { supabase, user } = await requireUser()

  const [templates, added] = await Promise.all([
    // Shared rows with a key are the catalog; everyone may read them.
    supabase.from('categories').select(CATEGORY_COLUMNS).is('user_id', null).not('default_key', 'is', null),
    supabase.from('categories').select('source_template_id').eq('user_id', user.id).not('source_template_id', 'is', null),
  ])
  if (templates.error) throw templates.error
  if (added.error) throw added.error

  return (
    <StoreClient
      templates={templates.data as unknown as Category[]}
      addedTemplateIds={added.data.map(row => row.source_template_id as string)}
    />
  )
}
