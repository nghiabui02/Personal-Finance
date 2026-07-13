'use client'

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import Header from './header'
import Sidebar from './sidebar'

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

// Paths that make the "More" tab active
const MORE_PATHS = ['/more', '/categories', '/budgets', '/debts', '/saving-goals', '/recurring', '/settings']

// Sub-pages of More that should show a back button on mobile
const MORE_SUB_PATHS = ['/categories', '/budgets', '/debts', '/saving-goals', '/recurring', '/settings']

const BOTTOM_NAV = [
  {
    href: '/dashboard',
    label: 'Overview',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z"/>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z"/>
      </svg>
    ),
  },
  {
    href: '/transactions',
    label: 'Transactions',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"/>
      </svg>
    ),
  },
  {
    href: '/reports',
    label: 'Reports',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"/>
      </svg>
    ),
  },
  {
    href: '/wallets',
    label: 'Wallets',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3"/>
      </svg>
    ),
  },
  {
    href: '/more',
    label: 'More',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"/>
      </svg>
    ),
  },
]

function MobileBottomNav({ pathname }: { pathname: string }) {
  const isMoreActive = MORE_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch h-14">
        {BOTTOM_NAV.map(item => {
          const active = item.href === '/more'
            ? isMoreActive
            : pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                active
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              <span className={active ? 'opacity-100' : 'opacity-60'}>{item.icon}</span>
              <span className={`text-[9px] font-medium tracking-wide ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default function AppShell({
  children,
  user,
}: {
  children: ReactNode
  user: User
}) {
  const pathname = usePathname()

  const title = PAGE_TITLES[pathname] ?? Object.entries(PAGE_TITLES).find(([k]) => pathname.startsWith(k + '/'))?.at(1) ?? 'Finance'
  const isMoreSubPage = MORE_SUB_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))

  return (
    <div className="bg-gray-50 dark:bg-gray-950 md:h-dvh md:overflow-hidden md:flex md:flex-col">
      {/* Full-width header */}
      <Header
        user={user}
        title={title}
        backHref={isMoreSubPage ? '/more' : undefined}
      />

      {/* Desktop sidebar — fixed, full height, above the header */}
      <div className="hidden md:block fixed inset-y-0 left-0 z-30">
        <Sidebar user={user} />
      </div>

      <main className="pt-4 px-4 pb-bottom-nav md:pb-6 md:flex-1 md:overflow-y-auto md:overscroll-contain md:pt-6 md:px-6 md:ml-60 md:min-w-0">
        {children}
      </main>

      <MobileBottomNav pathname={pathname} />
    </div>
  )
}
