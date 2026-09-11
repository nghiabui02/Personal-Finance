import Link from 'next/link'

const CHEVRON = (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
  </svg>
)

/**
 * The shell every dashboard panel shares: one heading scale, one link
 * treatment, one card frame. Panels own their content, never their chrome —
 * that is what kept five cards drifting apart before.
 */
export function SectionCard({
  title,
  action,
  className = '',
  children,
}: {
  title: string
  action?: { label: string; href: string }
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={`bg-white dark:bg-gray-900 rounded-2xl border border-hairline dark:border-gray-800 p-5 ${className}`}>
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
          {title}
        </h2>
        {action && (
          <Link
            href={action.href}
            className="group flex items-center gap-0.5 text-xs font-medium text-gray-400 hover:text-brand dark:hover:text-brand transition-colors rounded"
          >
            {action.label}
            <span className="transition-transform group-hover:translate-x-0.5">{CHEVRON}</span>
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

/** Empty state: says what is missing, then offers the one action that fixes it. */
export function SectionEmpty({
  message,
  action,
}: {
  message: string
  action?: { label: string; href: string }
}) {
  return (
    <div className="py-7 text-center">
      <p className="text-sm text-gray-400 dark:text-gray-500">{message}</p>
      {action && (
        <Link
          href={action.href}
          className="mt-2 inline-block text-xs font-medium text-brand hover:text-brand-strong transition-colors rounded"
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}
