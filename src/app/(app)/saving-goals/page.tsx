import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import SavingGoalsClient from './_components/saving-goals-client'

export const metadata: Metadata = { title: 'Saving Goals' }
export const dynamic = 'force-dynamic'

export default async function SavingGoalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

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
