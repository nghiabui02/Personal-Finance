import type { Metadata } from 'next'
import WalletsClient from './_components/wallets-client'
import { requireUser } from '@/lib/server/auth'
import { walletsQuery } from '@/lib/server/queries'

export const metadata: Metadata = { title: 'Wallets' }

export const dynamic = 'force-dynamic'

export default async function WalletsPage() {
  const { supabase, user } = await requireUser()

  // Same order as every other wallet list; this page used to sort by
  // creation date, so the picker and the page disagreed.
  const { data: wallets } = await walletsQuery(supabase, user.id)

  return <WalletsClient wallets={wallets ?? []} />
}
