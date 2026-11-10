/** A titled card on the settings screen. */
export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-hairline p-6">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500 mb-5">{title}</p>
      {children}
    </div>
  )
}

export type Status = { type: 'success' | 'error'; text: string }

/** What came of the last save, in green or red. */
export function StatusLine({ status }: { status: Status | null }) {
  if (!status) return null
  return (
    <p className={`mt-3 text-sm ${
      status.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
    }`}>
      {status.text}
    </p>
  )
}
