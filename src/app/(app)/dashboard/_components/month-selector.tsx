'use client'

import { useRouter } from 'next/navigation'

export function MonthSelector({ month }: { month: string }) {
  const router = useRouter()

  const now = new Date()
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const isCurrentMonth = month === currentYM

  function navigate(dir: -1 | 1) {
    const [year, monthNum] = month.split('-').map(Number)
    const date = new Date(year, monthNum - 1 + dir, 1)
    const next = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    router.replace(`/dashboard?month=${next}`, { scroll: false })
  }

  const [year, monthNum] = month.split('-').map(Number)
  const label = new Date(year, monthNum - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={() => navigate(-1)}
        aria-label="Previous month"
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
      </button>
      <h1 className="px-1 text-xl font-semibold text-gray-900 dark:text-gray-100">{label}</h1>
      <button
        onClick={() => navigate(1)}
        aria-label="Next month"
        disabled={isCurrentMonth}
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:pointer-events-none"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </button>
    </div>
  )
}
