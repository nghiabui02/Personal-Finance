import type { Metadata } from 'next'
import WalletsClient from './_components/wallets-client'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Wallets' }

export const dynamic = 'force-dynamic'

export default async function WalletsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: wallets } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at')

  return <WalletsClient wallets={wallets ?? []} />
}
