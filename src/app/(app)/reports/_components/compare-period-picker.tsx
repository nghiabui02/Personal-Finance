'use client'

import { useRef, useState } from 'react'
import { useDismiss } from '@/components/ui/use-dismiss'
import { getPeriodLabel, navigatePeriod, type PeriodType } from '@/lib/utils/period'

const COMPARE_OFFSETS = [1, 2, 3, 4, 5, 6]

/** "Compare with: <earlier period>" and the list to change it. Mount it with a
 *  `key` that changes with the period so the list closes when the period does. */
export function ComparePeriodPicker({
  period,
  start,
  offset,
  loading,
  isEmpty,
  onSelect,
}: {
  period: PeriodType
  start: string
  offset: number
  loading: boolean
  isEmpty: boolean
  onSelect: (offset: number) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useDismiss(ref, open, () => setOpen(false))

  const labelFor = (candidate: number) => getPeriodLabel(period, navigatePeriod(period, start, -candidate))

  return (
    <div ref={ref} className="relative mb-3 -mt-1">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={loading}
        className="text-[11px] text-white/45 hover:text-slate-300 transition-colors flex items-center gap-1 disabled:opacity-50"
      >
        Compare with: {loading ? 'Loading…' : labelFor(offset)}
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {!loading && isEmpty && (
        <p className="text-[11px] text-amber-500/80 mt-1">
          No transactions in that period — the analysis will skip the comparison.
        </p>
      )}
      {open && (
        <div className="absolute z-30 mt-1 w-56 bg-slate-700 rounded-xl border border-slate-600 shadow-xl py-1 animate-dropdown-in">
          {COMPARE_OFFSETS.map(candidate => (
            <button
              key={candidate}
              onClick={() => { setOpen(false); onSelect(candidate) }}
              className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-slate-600 ${
                candidate === offset ? 'bg-slate-600 text-white font-medium' : 'text-slate-200'
              }`}
            >
              {labelFor(candidate)}
              {candidate === 1 && <span className="text-slate-300"> · previous</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
