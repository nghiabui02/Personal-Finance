'use client'

import { createContext, useContext, useOptimistic, useTransition, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ContentSkeleton } from './skeleton'

type NavigateOptions = { scroll?: boolean }
type Navigation = {
  isPending: boolean
  pendingUrl: URL | null
  push: (href: string, options?: NavigateOptions) => void
  replace: (href: string, options?: NavigateOptions) => void
}

export const NavigationContext = createContext<Navigation | null>(null)

/** Only read navigation enters this transition. Mutations keep their button loading. */
export function NavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingUrl, setPendingUrl] = useOptimistic<URL | null>(null)

  function navigate(method: 'push' | 'replace', href: string, options?: NavigateOptions) {
    startTransition(() => {
      setPendingUrl(new URL(href, window.location.href))
      router[method](href, options)
    })
  }

  return (
    <NavigationContext value={{
      isPending, pendingUrl,
      push: (href, options) => navigate('push', href, options),
      replace: (href, options) => navigate('replace', href, options),
    }}>
      {children}
    </NavigationContext>
  )
}

export function useNavigation() {
  const navigation = useContext(NavigationContext)
  if (!navigation) throw new Error('useNavigation requires NavigationProvider in the app layout')
  return navigation
}

export function useNavigationPathname() {
  const pathname = usePathname()
  const { pendingUrl } = useNavigation()
  return pendingUrl?.pathname ?? pathname
}

export function usePendingSearchParam(name: string, fallback: string) {
  const { pendingUrl } = useNavigation()
  return pendingUrl?.searchParams.get(name) ?? fallback
}

/** Keep children mounted so loading does not reset forms or cancel their transitions. */
export function LoadingContent({ children, pending, className = 'space-y-4' }: { children: ReactNode; pending?: boolean; className?: string }) {
  const { isPending, pendingUrl } = useNavigation()
  const pathname = usePathname()
  const loading = pending ?? (isPending && pendingUrl?.pathname === pathname)

  return (
    <>
      {loading && <ContentSkeleton />}
      <div className={loading ? 'hidden' : className} hidden={loading} inert={loading}>
        {children}
      </div>
    </>
  )
}
