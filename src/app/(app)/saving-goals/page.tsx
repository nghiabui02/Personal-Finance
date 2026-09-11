import type { Metadata } from 'next'
import { requireUser } from '@/lib/server/auth'
import SavingGoalsClient from './_components/saving-goals-client'

export const metadata: Metadata = { title: 'Saving Goals' }
export const dynamic = 'force-dynamic'

export default async function SavingGoalsPage() {
  const { supabase, user } = await requireUser()

  const { data: goals } = await supabase
    .from('saving_goals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <SavingGoalsClient
      goals={(goals ?? []) as unknown as Parameters<typeof SavingGoalsClient>[0]['goals']}
    />
  )
}
