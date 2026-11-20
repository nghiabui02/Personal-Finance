'use client'
import { useTranslations } from 'next-intl'

import { useNavigation, useNavigationPathname } from '@/components/ui/navigation-loading'
import { TabGroup } from './tab-group'

/**
 * Sibling-screen switcher. Mobile used to reach these through a "More" tab,
 * which buried MVP screens two taps deep; now related screens sit next to each
 * other under one bottom-nav tab.
 */

export interface Segment {
  href: string
  label: string
}

export function SegmentNav({ items }: { items: Segment[] }) {
  const t = useTranslations('navigation')
  const pathname = useNavigationPathname()
  const navigation = useNavigation()

  return (
    <nav className="-mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto no-scrollbar">
      <TabGroup
        tabs={items.map(item => ({ key: item.href, label: t(item.label) }))}
        value={pathname}
        onChange={href => navigation.push(href, { scroll: false })}
        className="w-fit"
      />
    </nav>
  )
}

/** The two route groups the bottom nav collapses into. */
export const REPORT_SEGMENTS: Segment[] = [
  { href: '/reports', label: 'reports' },
  { href: '/budgets', label: 'budgets' },
]

export const MONEY_SEGMENTS: Segment[] = [
  { href: '/wallets', label: 'wallets' },
  { href: '/debts', label: 'debts' },
  { href: '/saving-goals', label: 'goals' },
  { href: '/recurring', label: 'recurring' },
]
