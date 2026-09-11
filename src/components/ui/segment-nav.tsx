'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

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
  const pathname = usePathname()

  return (
    <nav className="-mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto no-scrollbar">
      <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800/60">
        {items.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                active
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

/** The two route groups the bottom nav collapses into. */
export const REPORT_SEGMENTS: Segment[] = [
  { href: '/reports', label: 'Reports' },
  { href: '/budgets', label: 'Budgets' },
]

export const MONEY_SEGMENTS: Segment[] = [
  { href: '/wallets', label: 'Wallets' },
  { href: '/debts', label: 'Debts' },
  { href: '/saving-goals', label: 'Goals' },
  { href: '/recurring', label: 'Recurring' },
]
