'use client'

import Link from 'next/link'
import { useContext, type ComponentProps } from 'react'
import { NavigationContext } from './navigation-loading'

/** onNavigate preserves native modified clicks, downloads and external links. */
export default function NavigationLink({ href, replace, scroll, ...props }: Omit<ComponentProps<typeof Link>, 'href' | 'onNavigate'> & { href: string }) {
  const navigation = useContext(NavigationContext)

  return (
    <Link {...props} href={href} replace={replace} scroll={scroll} onNavigate={event => {
      if (!navigation || href.startsWith('#')) return
      event.preventDefault()
      navigation[replace ? 'replace' : 'push'](href, { scroll })
    }} />
  )
}
