import { requireUser } from '@/lib/server/auth'
import AppShell from './_components/app-shell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireUser()

  return <AppShell user={user}>{children}</AppShell>
}
