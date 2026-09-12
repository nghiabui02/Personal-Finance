'use client'

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import Header from './header'
import Sidebar from './sidebar'
import { QuickAddButton, type QuickAddData } from './quick-add-button'
import { Toaster } from '@/components/ui/toast'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/transactions': 'Transactions',
  '/wallets': 'Wallets',
  '/budgets': 'Budgets',
  '/reports': 'Reports',
  '/debts': 'Debts',
  '/recurring': 'Recurring',
  '/saving-goals': 'Saving Goals',
  '/categories': 'Categories',
  '/settings': 'Settings',
  '/more': 'More',
}

// Sub-pages of the account hub that show a back button on mobile
const ACCOUNT_SUB_PATHS = ['/categories', '/settings']

const OVERVIEW_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
)
const TRANSACTIONS_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4"/>
  </svg>
)
const PLAN_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"/>
  </svg>
)
const MONEY_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3"/>
  </svg>
)

/**
 * Four tabs, not five, and no "More" drawer: every screen is one tap from a
 * tab. Reports/Budgets and Wallets/Debts/Goals/Recurring each collapse into one
 * tab and switch with a SegmentNav inside the screen.
 */
const BOTTOM_NAV = [
  { href: '/dashboard',   label: 'Overview',     icon: OVERVIEW_ICON,     group: ['/dashboard'] },
  { href: '/transactions', label: 'Transactions', icon: TRANSACTIONS_ICON, group: ['/transactions'] },
  { href: '/reports',     label: 'Plan',         icon: PLAN_ICON,         group: ['/reports', '/budgets'] },
  { href: '/wallets',     label: 'Money',        icon: MONEY_ICON,        group: ['/wallets', '/debts', '/saving-goals', '/recurring'] },
]

function MobileBottomNav({ pathname, quickAdd }: { pathname: string; quickAdd: QuickAddData }) {
  const tab = (item: (typeof BOTTOM_NAV)[number]) => {
    const active = item.group.some(p => pathname === p || pathname.startsWith(p + '/'))
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? 'page' : undefined}
        className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
          active ? 'text-brand' : 'text-gray-400 dark:text-gray-500'
        }`}
      >
        <span className={active ? 'opacity-100' : 'opacity-60'}>{item.icon}</span>
        <span className="text-[9px] font-medium tracking-wide">{item.label}</span>
      </Link>
    )
  }

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-hairline"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch h-14">
        {BOTTOM_NAV.slice(0, 2).map(tab)}
        {/* Logging a transaction is the one thing done every day — it gets the
            centre slot instead of a floating button that overlaps content. */}
        <div className="w-16 shrink-0 flex items-start justify-center">
          <QuickAddButton data={quickAdd} />
        </div>
        {BOTTOM_NAV.slice(2).map(tab)}
      </div>
    </nav>
  )
}

export default function AppShell({
  children,
  user,
  quickAdd,
}: {
  children: ReactNode
  user: User
  quickAdd: QuickAddData
}) {
  const pathname = usePathname()

  const title = PAGE_TITLES[pathname] ?? Object.entries(PAGE_TITLES).find(([k]) => pathname.startsWith(k + '/'))?.at(1) ?? 'Finance'
  const isAccountSubPage = ACCOUNT_SUB_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))

  return (
    <div className="bg-gray-50 dark:bg-gray-950 md:h-dvh md:overflow-hidden md:flex md:flex-col">
      {/* Full-width header */}
      <Header
        user={user}
        title={title}
        backHref={isAccountSubPage ? '/more' : undefined}
      />

      {/* Desktop sidebar — fixed, full height, above the header */}
      <div className="hidden md:block fixed inset-y-0 left-0 z-30">
        <Sidebar user={user} />
      </div>

      <main className="pt-4 px-4 pb-bottom-nav md:pb-6 md:flex-1 md:overflow-y-auto md:overscroll-contain md:pt-6 md:px-6 md:ml-60 md:min-w-0">
        {children}
      </main>

      <MobileBottomNav pathname={pathname} quickAdd={quickAdd} />
      <Toaster />
    </div>
  )
}
