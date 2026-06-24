import Link from 'next/link'

export type Alert = {
  type: 'budget_over' | 'budget_near' | 'debt_due'
  label: string
  href: string
}

export function AlertsBanner({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return null

  return (
    <div className="space-y-2">
      {alerts.map((a, i) => (
        <Link key={i} href={a.href} className="flex items-center gap-3 bg-white dark:bg-gray-900 border rounded-xl px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors group" style={{ borderColor: a.type === 'debt_due' ? '#f59e0b44' : a.type === 'budget_over' ? '#ef444433' : '#f59e0b33' }}>
          <span className="text-base shrink-0">
            {a.type === 'debt_due' ? '⏰' : a.type === 'budget_over' ? '🔴' : '🟡'}
          </span>
          <p className="text-xs text-gray-700 dark:text-gray-300 flex-1">{a.label}</p>
          <svg className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 dark:group-hover:text-gray-400 shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
          </svg>
        </Link>
      ))}
    </div>
  )
}
