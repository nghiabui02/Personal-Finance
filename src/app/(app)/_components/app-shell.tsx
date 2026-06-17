'use client'

import { ReactNode, useState } from 'react'
import { usePathname } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import Header from './header'
import Sidebar from './sidebar'

const ANIM = 220 // ms

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
    <div className="flex h-dvh overflow-hidden overscroll-none bg-gray-50 dark:bg-gray-950">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            style={{
              animation: `${sidebarClosing ? 'backdrop-out' : 'backdrop-in'} ${ANIM}ms ease-out forwards`,
            }}
            onClick={handleCloseSidebar}
          />
          {/* Sidebar panel */}
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

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header user={user} onMenuToggle={sidebarOpen ? handleCloseSidebar : handleOpenSidebar} />
        <main className="flex-1 overflow-y-auto overscroll-contain p-4 md:p-6 pb-safe" style={{ WebkitOverflowScrolling: 'touch' }}>{children}</main>
      </div>
    </div>
  )
}
