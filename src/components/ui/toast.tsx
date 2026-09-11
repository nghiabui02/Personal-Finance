'use client'

import { useSyncExternalStore } from 'react'

/**
 * App-wide toast. Mount <Toaster /> once in the shell, then call `toast.error(…)`
 * from anywhere — including plain `catch` blocks that have no React context.
 *
 * A failed mutation used to do nothing at all: the row stayed on screen and the
 * user could not tell a network error from a slow render. Every catch ends here.
 */

type ToastTone = 'error' | 'success'

interface Toast {
  id: number
  tone: ToastTone
  message: string
}

const VISIBLE_MS: Record<ToastTone, number> = { error: 6000, success: 3000 }

let toasts: Toast[] = []
let nextId = 1
const listeners = new Set<() => void>()

function publish(next: Toast[]) {
  toasts = next
  for (const notify of listeners) notify()
}

function dismiss(id: number) {
  publish(toasts.filter(t => t.id !== id))
}

function push(tone: ToastTone, message: string) {
  const id = nextId++
  publish([...toasts, { id, tone, message }])
  setTimeout(() => dismiss(id), VISIBLE_MS[tone])
}

export const toast = {
  error: (message: string) => push('error', message),
  success: (message: string) => push('success', message),
}

/** Turns an unknown thrown value into something worth showing a person. */
export function toastError(err: unknown, fallback: string) {
  toast.error(err instanceof Error && err.message ? err.message : fallback)
}

const subscribe = (cb: () => void) => {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}
const EMPTY: Toast[] = []

const TONE_STYLES: Record<ToastTone, string> = {
  error: 'border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300',
  success: 'border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300',
}

const TONE_ICONS: Record<ToastTone, React.ReactNode> = {
  error: <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />,
  success: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
}

export function Toaster() {
  const items = useSyncExternalStore(subscribe, () => toasts, () => EMPTY)
  if (items.length === 0) return null

  // Rendered in place rather than through a portal: it is already mounted at
  // the root of the shell, so a portal would only add a hydration seam.
  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[300] flex flex-col gap-2 w-[min(26rem,calc(100vw-2rem))] bottom-above-nav md:bottom-auto md:top-5"
      role="status"
      aria-live="polite"
    >
      {items.map(t => (
        <div
          key={t.id}
          className={`flex items-start gap-2.5 rounded-xl border bg-white dark:bg-gray-900 px-4 py-3 shadow-lg animate-fade-up ${TONE_STYLES[t.tone]}`}
        >
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
               className="mt-0.5 shrink-0" aria-hidden="true">
            {TONE_ICONS[t.tone]}
          </svg>
          <p className="text-sm flex-1 min-w-0">{t.message}</p>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss"
            className="shrink-0 -mr-1 -mt-0.5 p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
