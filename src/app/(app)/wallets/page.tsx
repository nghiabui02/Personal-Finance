import type { Metadata } from 'next'
import WalletsClient from './_components/wallets-client'
import { requireUser } from '@/lib/server/auth'

export const metadata: Metadata = { title: 'Wallets' }

export const dynamic = 'force-dynamic'

export default async function WalletsPage() {
  const { supabase, user } = await requireUser()

  const { data: wallets } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at')

  return <WalletsClient wallets={wallets ?? []} />
}
