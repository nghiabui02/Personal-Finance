import { requireUser } from '@/lib/server/auth'
import { CATEGORY_COLUMNS } from '@/lib/api/categories'
import { WALLET_COLUMNS } from '@/lib/api/wallets'
import AppShell from './_components/app-shell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await requireUser()

  // The quick-add button lives in the shell, so its options load once here
  // instead of once per screen that wants a "new transaction" affordance.
  const [{ data: categories }, { data: wallets }, { data: debts }] = await Promise.all([
    supabase.from('categories').select(CATEGORY_COLUMNS).order('is_default', { ascending: false }).order('name'),
    supabase.from('wallets').select(WALLET_COLUMNS).eq('user_id', user.id).order('is_default', { ascending: false }).order('name'),
    supabase.from('debts').select('id, type, person_name, remaining_amount').eq('user_id', user.id).eq('status', 'active').gt('remaining_amount', 0),
  ])

  const quickAdd = {
    categories: categories ?? [],
    wallets: (wallets ?? []) as never,
    debts: (debts ?? []).map(d => ({
      id: d.id,
      type: d.type as 'lend' | 'borrow',
      person_name: d.person_name,
      remaining_amount: Number(d.remaining_amount),
    })),
  }

  return <AppShell user={user} quickAdd={quickAdd}>{children}</AppShell>
}
