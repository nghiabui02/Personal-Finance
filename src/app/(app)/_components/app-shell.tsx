'use client'

import { ReactNode, useState } from 'react'
import { usePathname } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import Header from './header'
import Sidebar from './sidebar'

const ANIM = 220 // ms

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/transactions': 'Transactions',
  '/wallets': 'Wallets',
  '/budgets': 'Budgets',
  '/reports': 'Reports',
  '/debts': 'Debts',
  '/settings': 'Settings',
}

export default function AppShell({
  children,
  user,
}: {
  children: ReactNode
  user: User
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarClosing, setSidebarClosing] = useState(false)
  const pathname = usePathname()

  // Close mobile sidebar on navigation
  const [prevPathname, setPrevPathname] = useState(pathname)
  if (prevPathname !== pathname) {
    setPrevPathname(pathname)
    if (sidebarOpen) handleCloseSidebar()
  }

  function handleOpenSidebar() {
    setSidebarClosing(false)
    setSidebarOpen(true)
  }

  function handleCloseSidebar() {
    setSidebarClosing(true)
    setTimeout(() => {
      setSidebarOpen(false)
      setSidebarClosing(false)
    }, ANIM)
  }

  return (
    // Mobile: no fixed height → whole page scrolls (header included, URL bar can hide)
    // Desktop md+: fixed h-dvh layout → only inner main scrolls
    <div className="bg-gray-50 dark:bg-gray-950 md:flex md:h-dvh md:overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50"
            style={{
              animation: `${sidebarClosing ? 'backdrop-out' : 'backdrop-in'} ${ANIM}ms ease-out forwards`,
            }}
            onClick={handleCloseSidebar}
          />
          <div
            className="relative z-10 w-64"
            style={{
              animation: `${sidebarClosing ? 'sidebar-out' : 'sidebar-in'} ${ANIM}ms cubic-bezier(0.32,0.72,0,1) forwards`,
            }}
          >
            <Sidebar onClose={handleCloseSidebar} />
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-1 md:min-w-0 md:overflow-hidden">
        <Header user={user} title={PAGE_TITLES[pathname] ?? 'Finance'} onMenuToggle={sidebarOpen ? handleCloseSidebar : handleOpenSidebar} />
        <main className="pt-4 px-4 pb-safe-or-4 md:flex-1 md:overflow-y-auto md:overscroll-contain md:pt-6 md:px-6">
          {children}
        </main>
      </div>
    </div>
  )
}
