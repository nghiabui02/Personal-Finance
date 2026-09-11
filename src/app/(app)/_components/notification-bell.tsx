'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '@/lib/api/client'
import type { AppNotification, NotificationSeverity } from '@/app/api/notifications/route'

const SEVERITY_DOT: Record<NotificationSeverity, string> = {
  alert: 'bg-rose-500',
  warning: 'bg-amber-400',
  info: 'bg-sky-400',
  success: 'bg-emerald-500',
}

function patchNotifications(action: 'read' | 'dismiss', ids: string[]) {
  return apiFetch('/api/notifications', {
    method: 'PATCH',
    body: JSON.stringify({ action, ids }),
  })
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const panelRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  // (Re)load on mount and after navigation — acting on a notification
  // (paying a debt, editing a budget) should clear it
  useEffect(() => {
    let cancelled = false
    apiFetch<AppNotification[]>('/api/notifications')
      .then(data => { if (!cancelled) setItems(data) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [pathname])

  // Opening persists the read marks, but items stay highlighted until the
  // panel closes so the user can still tell which ones are new
  const openPanel = () => {
    setOpen(true)
    const unreadIds = items.filter(i => !i.read).map(i => i.id)
    if (unreadIds.length > 0) patchNotifications('read', unreadIds).catch(() => {})
  }

  const closePanel = () => {
    setOpen(false)
    setItems(prev => prev.some(i => !i.read) ? prev.map(i => ({ ...i, read: true })) : prev)
  }

  const dismiss = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
    patchNotifications('dismiss', [id]).catch(() => {})
  }

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) closePanel()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const count = items.length
  const unreadCount = items.filter(i => !i.read).length

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => (open ? closePanel() : openPanel())}
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
        className="relative p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-semibold flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-40 w-[min(22rem,calc(100vw-2rem))] bg-white dark:bg-gray-900 rounded-2xl border border-hairline shadow-lg overflow-hidden animate-dropdown-in">
          <div className="px-4 py-3 border-b border-hairline flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notifications</p>
            {count > 0 && (
              <span className="text-xs text-gray-400 dark:text-gray-500">{count}</span>
            )}
          </div>

          <div className="max-h-[min(24rem,60vh)] overflow-y-auto">
            {loading ? (
              <p className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">Loading…</p>
            ) : count === 0 ? (
              <div className="px-4 py-10 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="mx-auto text-gray-300 dark:text-gray-600 mb-2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                <p className="text-sm text-gray-500 dark:text-gray-400">You&apos;re all caught up</p>
              </div>
            ) : (
              <div className="py-1">
                {items.map(n => (
                  <div key={n.id} className="group relative">
                    <Link
                      href={n.href}
                      onClick={closePanel}
                      className="flex items-start gap-2.5 pl-4 pr-9 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
                    >
                      <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${n.read ? 'bg-gray-300 dark:bg-gray-600' : SEVERITY_DOT[n.severity]}`} />
                      <span className="min-w-0">
                        <span className={`block text-[13px] leading-snug ${n.read ? 'font-normal text-gray-500 dark:text-gray-400' : 'font-medium text-gray-800 dark:text-gray-200'}`}>
                          {n.title}
                        </span>
                        {n.detail && (
                          <span className="block text-xs text-gray-400 dark:text-gray-500 mt-0.5 leading-snug tabular-nums">
                            {n.detail}
                          </span>
                        )}
                      </span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => dismiss(n.id)}
                      aria-label="Dismiss notification"
                      className="absolute right-2 top-2 p-1 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-600 dark:hover:text-gray-300 dark:hover:bg-gray-800 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
