import { requireUser } from '@/lib/server/auth'
import AppShell from './_components/app-shell'
import { NavigationProvider } from '@/components/ui/navigation-loading'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireUser()

  return <NavigationProvider><AppShell user={user}>{children}</AppShell></NavigationProvider>
}
